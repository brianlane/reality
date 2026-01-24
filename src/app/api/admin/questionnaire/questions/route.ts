import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { adminQuestionnaireQuestionCreateSchema } from "@/lib/validations";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";
import { normalizeQuestionOptions } from "@/lib/questionnaire";

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
  const sectionId = url.searchParams.get("sectionId") ?? undefined;
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Number(url.searchParams.get("limit") ?? "50");
  const includeDeleted = url.searchParams.get("includeDeleted") === "true";

  const where = {
    ...(sectionId ? { sectionId } : {}),
    ...(includeDeleted ? {} : { deletedAt: null }),
    ...(includeDeleted ? {} : { section: { deletedAt: null } }),
  };

  const [questions, total] = await Promise.all([
    db.questionnaireQuestion.findMany({
      where,
      include: {
        section: { select: { id: true, title: true } },
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.questionnaireQuestion.count({ where }),
  ]);

  return successResponse({
    questions: questions.map((question) => ({
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
      mlWeight: question.mlWeight,
      isDealbreaker: question.isDealbreaker,
      deletedAt: question.deletedAt,
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

  let body: ReturnType<typeof adminQuestionnaireQuestionCreateSchema.parse>;
  try {
    body = adminQuestionnaireQuestionCreateSchema.parse(await request.json());
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400, [
      { message: (error as Error).message },
    ]);
  }

  const section = await db.questionnaireSection.findFirst({
    where: { id: body.sectionId, deletedAt: null },
  });
  if (!section) {
    return errorResponse("NOT_FOUND", "Section not found", 404);
  }

  const optionsResult = await normalizeQuestionOptions(body.type, body.options);
  if (!optionsResult.ok) {
    return errorResponse("VALIDATION_ERROR", optionsResult.message, 400);
  }

  await getOrCreateAdminUser({ userId: auth.userId, email: auth.email });

  const question = await db.questionnaireQuestion.create({
    data: {
      sectionId: body.sectionId,
      prompt: body.prompt,
      helperText: body.helperText ?? null,
      type: body.type,
      options: optionsResult.value ?? undefined,
      isRequired: body.isRequired ?? false,
      order: body.order ?? 0,
      isActive: body.isActive ?? true,
      mlWeight: body.mlWeight ?? 1.0,
      isDealbreaker: body.isDealbreaker ?? false,
    },
  });

  return successResponse({ question });
}
