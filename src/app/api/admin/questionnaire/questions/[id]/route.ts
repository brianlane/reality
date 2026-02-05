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
      section: {
        select: {
          id: true,
          title: true,
          pageId: true,
          page: { select: { id: true, title: true } },
        },
      },
    },
  });

  if (!question) {
    return errorResponse("NOT_FOUND", "Question not found", 404);
  }

  // Fetch all questions in the same section for navigation
  const sectionQuestions = await db.questionnaireQuestion.findMany({
    where: {
      sectionId: question.sectionId,
      ...(includeDeleted ? {} : { deletedAt: null }),
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    select: { id: true, order: true, prompt: true },
  });

  // Find previous and next questions
  const currentIndex = sectionQuestions.findIndex((q) => q.id === id);
  // Handle edge case where question is not found in section list (e.g., race condition)
  const prevQuestion =
    currentIndex > 0 ? sectionQuestions[currentIndex - 1] : null;
  const nextQuestion =
    currentIndex >= 0 && currentIndex < sectionQuestions.length - 1
      ? sectionQuestions[currentIndex + 1]
      : null;

  return successResponse({
    question: {
      id: question.id,
      sectionId: question.sectionId,
      sectionTitle: question.section.title,
      pageId: question.section.pageId,
      pageTitle: question.section.page?.title ?? null,
      prompt: question.prompt,
      helperText: question.helperText,
      type: question.type,
      options: question.options,
      order: question.order,
      isRequired: question.isRequired,
      isActive: question.isActive,
      mlWeight: question.mlWeight,
      isDealbreaker: question.isDealbreaker,
      deletedAt: question.deletedAt,
    },
    navigation: {
      prevQuestion: prevQuestion
        ? { id: prevQuestion.id, prompt: prevQuestion.prompt }
        : null,
      nextQuestion: nextQuestion
        ? { id: nextQuestion.id, prompt: nextQuestion.prompt }
        : null,
      totalInSection: sectionQuestions.length,
      // Ensure valid 1-indexed position (handle -1 case from findIndex)
      currentPosition: currentIndex >= 0 ? currentIndex + 1 : 1,
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
      helperText: body.helperText === undefined ? undefined : body.helperText,
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
      mlWeight: body.mlWeight,
      isDealbreaker: body.isDealbreaker,
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
