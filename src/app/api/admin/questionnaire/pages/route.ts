import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { adminQuestionnairePageCreateSchema } from "@/lib/validations";
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
  const limit = Number(url.searchParams.get("limit") ?? "50");
  const includeDeleted = url.searchParams.get("includeDeleted") === "true";

  const where = {
    ...(includeDeleted ? {} : { deletedAt: null }),
  };

  const [pages, total] = await Promise.all([
    db.questionnairePage.findMany({
      where,
      include: {
        _count: { select: { sections: { where: { deletedAt: null } } } },
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.questionnairePage.count({ where }),
  ]);

  return successResponse({
    pages: pages.map((page) => ({
      id: page.id,
      title: page.title,
      description: page.description,
      order: page.order,
      deletedAt: page.deletedAt,
      sectionCount: page._count.sections,
    })),
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      perPage: limit,
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

  let body: ReturnType<typeof adminQuestionnairePageCreateSchema.parse>;
  try {
    body = adminQuestionnairePageCreateSchema.parse(await request.json());
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400, [
      { message: (error as Error).message },
    ]);
  }

  await getOrCreateAdminUser({ userId: auth.userId, email: auth.email });

  const page = await db.questionnairePage.create({
    data: {
      title: body.title,
      description: body.description ?? null,
      order: body.order ?? 0,
    },
  });

  return successResponse({ page });
}
