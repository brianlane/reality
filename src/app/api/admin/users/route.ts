import { createClient } from "@supabase/supabase-js";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { adminUserCreateSchema } from "@/lib/validations";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";

export async function GET(request: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const role = url.searchParams.get("role") ?? undefined;
  const search = url.searchParams.get("search") ?? undefined;
  const includeDeleted = url.searchParams.get("includeDeleted") === "true";

  const where = {
    ...(includeDeleted ? {} : { deletedAt: null }),
    ...(role ? { role: role as never } : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { firstName: { contains: search, mode: "insensitive" as const } },
            { lastName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [users, total, totalApplicants, totalAdmins] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        applicant: {
          select: { id: true, applicationStatus: true, screeningStatus: true },
        },
      },
    }),
    db.user.count({ where }),
    db.user.count({
      where: {
        ...where,
        role: "APPLICANT",
      },
    }),
    db.user.count({
      where: {
        ...where,
        role: "ADMIN",
      },
    }),
  ]);

  // Get session data from Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let authDataMap = new Map();

  if (supabaseUrl && supabaseServiceKey) {
    try {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // Fetch ALL auth users by paginating through results
      const allAuthUsers = [];
      let page = 1;
      const perPage = 1000; // Max allowed by Supabase

      while (true) {
        const { data: authUsers, error } =
          await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage,
          });

        if (error) {
          console.error("Error fetching auth users:", error);
          break;
        }

        if (!authUsers || authUsers.users.length === 0) {
          break;
        }

        allAuthUsers.push(...authUsers.users);

        // If we got fewer users than perPage, we've reached the end
        if (authUsers.users.length < perPage) {
          break;
        }

        page++;
      }

      if (allAuthUsers.length > 0) {
        authDataMap = new Map(
          allAuthUsers.map((authUser) => [
            authUser.email?.toLowerCase(),
            authUser,
          ]),
        );
      }
    } catch (error) {
      console.error("Error fetching Supabase session data:", error);
      // Continue without session data
    }
  }

  // Calculate total active sessions count from all auth users
  let totalActive = 0;
  if (authDataMap.size > 0) {
    for (const [, authUser] of authDataMap) {
      if (authUser.last_sign_in_at) {
        totalActive++;
      }
    }
  }

  return successResponse({
    users: users.map((user) => {
      const authData = authDataMap.get(user.email.toLowerCase());

      return {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        createdAt: user.createdAt,
        deletedAt: user.deletedAt,
        applicant: user.applicant,
        // Session data
        authCreatedAt: authData?.created_at || null,
        lastSignIn: authData?.last_sign_in_at || null,
        emailConfirmed: authData?.email_confirmed_at || null,
        supabaseId: authData?.id || null,
      };
    }),
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      perPage: limit,
    },
    stats: {
      total,
      active: totalActive,
      applicants: totalApplicants,
      admins: totalAdmins,
    },
  });
}

export async function POST(request: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  if (!auth.email) {
    return errorResponse("UNAUTHORIZED", "Email not available", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  let body: ReturnType<typeof adminUserCreateSchema.parse>;
  try {
    body = adminUserCreateSchema.parse(await request.json());
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400, [
      { message: (error as Error).message },
    ]);
  }

  const existing = await db.user.findFirst({
    where: {
      OR: [
        { email: { equals: body.email.toLowerCase(), mode: "insensitive" } },
        { clerkId: body.clerkId },
      ],
    },
  });

  if (existing) {
    return errorResponse(
      "CONFLICT",
      "A user with that email or clerk ID already exists.",
      409,
    );
  }

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  const user = await db.user.create({
    data: {
      clerkId: body.clerkId,
      email: body.email.toLowerCase(),
      firstName: body.firstName,
      lastName: body.lastName,
      role: body.role,
    },
  });

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "MANUAL_ADJUSTMENT",
      targetId: user.id,
      targetType: "user",
      description: "Created user",
    },
  });

  return successResponse({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAt,
    },
  });
}
