import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { adminQuestionnaireSectionUpdateSchema } from "@/lib/validations";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const includeDeleted =
    new URL(request.url).searchParams.get("includeDeleted") === "true";

  const section = await db.questionnaireSection.findFirst({
    where: { id, ...(includeDeleted ? {} : { deletedAt: null }) },
    include: {
      questions: {
        where: includeDeleted ? {} : { deletedAt: null },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!section) {
    return errorResponse("NOT_FOUND", "Section not found", 404);
  }

  return successResponse({
    section: {
      id: section.id,
      title: section.title,
      description: section.description,
      order: section.order,
      isActive: section.isActive,
      deletedAt: section.deletedAt,
      questions: section.questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        helperText: question.helperText,
        type: question.type,
        order: question.order,
        isRequired: question.isRequired,
        isActive: question.isActive,
        deletedAt: question.deletedAt,
      })),
    },
  });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
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

  let body: ReturnType<typeof adminQuestionnaireSectionUpdateSchema.parse>;
  try {
    body = adminQuestionnaireSectionUpdateSchema.parse(await request.json());
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400, [
      { message: (error as Error).message },
    ]);
  }

  const existing = await db.questionnaireSection.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("NOT_FOUND", "Section not found", 404);
  }

  await getOrCreateAdminUser({ userId: auth.userId, email: auth.email });

  const section = await db.questionnaireSection.update({
    where: { id },
    data: {
      title: body.title,
      description:
        body.description === undefined ? undefined : body.description,
      order: body.order,
      isActive: body.isActive,
    },
  });

  return successResponse({ section });
}

export async function DELETE(_: Request, { params }: RouteContext) {
  const { id } = await params;
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

  const existing = await db.questionnaireSection.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("NOT_FOUND", "Section not found", 404);
  }

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  const section = await db.questionnaireSection.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy: adminUser.id,
    },
  });

  return successResponse({ section });
}
