import { ApplicationStatus } from "@prisma/client";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { adminApplicantCreateSchema } from "@/lib/validations";
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
  const status = url.searchParams.get("status") ?? undefined;
  const gender = url.searchParams.get("gender") ?? undefined;
  const screeningStatus = url.searchParams.get("screeningStatus") ?? undefined;
  const search = url.searchParams.get("search") ?? undefined;
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const includeDeleted = url.searchParams.get("includeDeleted") === "true";
  const sortBy = url.searchParams.get("sortBy") ?? "submittedAt";
  const sortOrder = url.searchParams.get("sortOrder") ?? "desc";

  const excludedStatuses: ApplicationStatus[] = [
    "WAITLIST",
    "WAITLIST_INVITED",
    "RESEARCH_INVITED",
    "RESEARCH_IN_PROGRESS",
    "RESEARCH_COMPLETED",
  ];
  const where = {
    ...(status
      ? { applicationStatus: status as never }
      : {
          applicationStatus: {
            notIn: excludedStatuses,
          },
        }),
    ...(gender ? { gender: gender as never } : {}),
    ...(screeningStatus ? { screeningStatus: screeningStatus as never } : {}),
    ...(includeDeleted ? {} : { deletedAt: null }),
    ...(search
      ? {
          user: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          },
        }
      : {}),
  };

  const [applications, total] = await Promise.all([
    db.applicant.findMany({
      where,
      include: {
        user: true,
        questionnaireAnswers: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { createdAt: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.applicant.count({ where }),
  ]);

  const stats = await db.applicant.groupBy({
    by: ["applicationStatus"],
    _count: true,
    where: { deletedAt: null },
  });

  const statusCounts = stats.reduce<Record<string, number>>((acc, item) => {
    acc[item.applicationStatus] = item._count;
    return acc;
  }, {});

  return successResponse({
    applications: applications.map((applicant) => ({
      id: applicant.id,
      firstName: applicant.user.firstName,
      lastName: applicant.user.lastName,
      email: applicant.user.email,
      age: applicant.age,
      gender: applicant.gender,
      occupation: applicant.occupation,
      applicationStatus: applicant.applicationStatus,
      screeningStatus: applicant.screeningStatus,
      compatibilityScore: applicant.compatibilityScore,
      submittedAt: applicant.submittedAt,
      questionnaireStartedAt:
        applicant.questionnaireAnswers[0]?.createdAt ?? null,
      reviewedAt: applicant.reviewedAt,
    })),
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      perPage: limit,
    },
    stats: {
      totalSubmitted: statusCounts.SUBMITTED ?? 0,
      pending: statusCounts.SCREENING_IN_PROGRESS ?? 0,
      approved: statusCounts.APPROVED ?? 0,
      waitlist:
        (statusCounts.WAITLIST ?? 0) + (statusCounts.WAITLIST_INVITED ?? 0),
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

  let body: ReturnType<typeof adminApplicantCreateSchema.parse>;
  try {
    body = adminApplicantCreateSchema.parse(await request.json());
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400, [
      { message: (error as Error).message },
    ]);
  }

  const existingUser = await db.user.findFirst({
    where: {
      OR: [
        {
          email: { equals: body.user.email.toLowerCase(), mode: "insensitive" },
        },
        { clerkId: body.user.clerkId },
      ],
    },
  });

  if (existingUser) {
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

  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        clerkId: body.user.clerkId,
        email: body.user.email.toLowerCase(),
        firstName: body.user.firstName,
        lastName: body.user.lastName,
        role: body.user.role,
      },
    });

    const applicant = await tx.applicant.create({
      data: {
        userId: user.id,
        age: body.applicant.age,
        gender: body.applicant.gender,
        location: body.applicant.location,
        cityFrom: body.applicant.cityFrom,
        industry: body.applicant.industry,
        occupation: body.applicant.occupation,
        employer: body.applicant.employer ?? null,
        education: body.applicant.education,
        incomeRange: body.applicant.incomeRange,
        referredBy: body.applicant.referredBy ?? null,
        aboutYourself: body.applicant.aboutYourself,
        applicationStatus: body.applicant.applicationStatus,
        screeningStatus: body.applicant.screeningStatus,
        photos: body.applicant.photos ?? [],
      },
      include: { user: true },
    });

    await tx.adminAction.create({
      data: {
        userId: adminUser.id,
        type: "MANUAL_ADJUSTMENT",
        targetId: applicant.id,
        targetType: "applicant",
        description: "Created applicant",
      },
    });

    return { user, applicant };
  });

  return successResponse({
    applicant: {
      id: result.applicant.id,
      firstName: result.applicant.user.firstName,
      lastName: result.applicant.user.lastName,
      applicationStatus: result.applicant.applicationStatus,
      screeningStatus: result.applicant.screeningStatus,
    },
  });
}
