import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { adminQuestionnaireQuestionUpdateSchema } from "@/lib/validations";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";
import { normalizeQuestionOptions } from "@/lib/questionnaire";
import { Prisma } from "@prisma/client";

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

  const question = await db.questionnaireQuestion.findFirst({
    where: { id, ...(includeDeleted ? {} : { deletedAt: null }) },
    include: {
      section: { select: { id: true, title: true } },
    },
  });

  if (!question) {
    return errorResponse("NOT_FOUND", "Question not found", 404);
  }

  return successResponse({
    question: {
      id: question.id,
      sectionId: question.sectionId,
      sectionTitle: question.section.title,
      prompt: question.prompt,
      helperText: question.helperText,
      type: question.type,
      options: question.options,
      order: question.order,
      isRequired: question.isRequired,
      isActive: question.isActive,
      deletedAt: question.deletedAt,
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

  let body: ReturnType<typeof adminQuestionnaireQuestionUpdateSchema.parse>;
  try {
    body = adminQuestionnaireQuestionUpdateSchema.parse(await request.json());
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400, [
      { message: (error as Error).message },
    ]);
  }

  const existing = await db.questionnaireQuestion.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("NOT_FOUND", "Question not found", 404);
  }

  if (body.sectionId) {
    const section = await db.questionnaireSection.findFirst({
      where: { id: body.sectionId, deletedAt: null },
    });
    if (!section) {
      return errorResponse("NOT_FOUND", "Section not found", 404);
    }
  }

  const nextType = body.type ?? existing.type;
  const nextOptions =
    body.options !== undefined ? body.options : existing.options;
  const optionsResult = await normalizeQuestionOptions(nextType, nextOptions);
  if (!optionsResult.ok) {
    return errorResponse("VALIDATION_ERROR", optionsResult.message, 400);
  }

  await getOrCreateAdminUser({ userId: auth.userId, email: auth.email });

  const question = await db.questionnaireQuestion.update({
    where: { id },
    data: {
      sectionId: body.sectionId,
      prompt: body.prompt,
      helperText: body.helperText ?? undefined,
      type: body.type,
      options:
        body.options !== undefined
          ? optionsResult.value === null
            ? Prisma.JsonNull
            : optionsResult.value
          : undefined,
      isRequired: body.isRequired,
      order: body.order,
      isActive: body.isActive,
    },
  });

  return successResponse({ question });
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

  const existing = await db.questionnaireQuestion.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("NOT_FOUND", "Question not found", 404);
  }

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  const question = await db.questionnaireQuestion.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy: adminUser.id,
    },
  });

  return successResponse({ question });
}
