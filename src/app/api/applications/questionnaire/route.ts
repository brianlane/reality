import { ApplicationStatus, Prisma, type Applicant } from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { applicantQuestionnaireSubmitSchema } from "@/lib/validations";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  QuestionnaireOptions,
  validateAnswerForQuestion,
} from "@/lib/questionnaire";

const ALLOWED_STATUSES: ApplicationStatus[] = [
  "WAITLIST_INVITED",
  "PAYMENT_PENDING",
  "DRAFT",
];

type InvitedApplicantResult = { applicant: Applicant } | { error: string };

async function requireInvitedApplicant(
  applicationId: string,
): Promise<InvitedApplicantResult> {
  const applicant = await db.applicant.findFirst({
    where: {
      id: applicationId,
      deletedAt: null,
      invitedOffWaitlistAt: { not: null },
    },
  });

  if (!applicant) {
    return { error: "Applicant not found or not invited." };
  }

  if (!ALLOWED_STATUSES.includes(applicant.applicationStatus)) {
    return { error: "Questionnaire access is not available for this status." };
  }

  return { applicant };
}

export async function GET(request: NextRequest) {
  const applicationId = request.nextUrl.searchParams.get("applicationId") ?? "";
  if (!applicationId) {
    return errorResponse(
      "MISSING_APPLICATION",
      "Application ID is required",
      400,
    );
  }

  // Allow preview mode to bypass applicant validation
  const isPreviewMode = applicationId === "preview-mock-id";

  if (!isPreviewMode) {
    const access = await requireInvitedApplicant(applicationId);
    if ("error" in access) {
      return errorResponse("FORBIDDEN", access.error, 403);
    }
  }

  const [sections, answers] = await Promise.all([
    db.questionnaireSection.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      include: {
        questions: {
          where: { deletedAt: null, isActive: true },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        },
      },
    }),
    // For preview mode, skip fetching answers (there are none)
    isPreviewMode
      ? Promise.resolve([])
      : db.questionnaireAnswer.findMany({
          where: { applicantId: applicationId },
        }),
  ]);

  const answerMap = answers.reduce<
    Record<string, { value: unknown; richText?: string | null }>
  >((acc, answer) => {
    acc[answer.questionId] = {
      value: answer.value,
      richText: answer.richText ?? null,
    };
    return acc;
  }, {});

  return successResponse({
    sections: sections.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      order: section.order,
      questions: section.questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        helperText: question.helperText,
        type: question.type,
        options: question.options,
        isRequired: question.isRequired,
        order: question.order,
      })),
    })),
    answers: answerMap,
  });
}

export async function POST(request: NextRequest) {
  let body: ReturnType<typeof applicantQuestionnaireSubmitSchema.parse>;
  try {
    body = applicantQuestionnaireSubmitSchema.parse(await request.json());
  } catch (error) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Invalid questionnaire payload",
      400,
      [{ message: (error as Error).message }],
    );
  }

  const applicationId = body.applicationId;
  const access = await requireInvitedApplicant(applicationId);
  if ("error" in access) {
    return errorResponse("FORBIDDEN", access.error, 403);
  }

  const questionIds = body.answers.map((answer) => answer.questionId);
  const questions = await db.questionnaireQuestion.findMany({
    where: {
      id: { in: questionIds },
      deletedAt: null,
      isActive: true,
      section: { deletedAt: null, isActive: true },
    },
  });

  if (questions.length !== questionIds.length) {
    return errorResponse(
      "INVALID_QUESTIONS",
      "One or more questions are no longer available.",
      400,
    );
  }

  const requiredQuestions = await db.questionnaireQuestion.findMany({
    where: {
      isRequired: true,
      deletedAt: null,
      isActive: true,
      section: { deletedAt: null, isActive: true },
    },
    select: { id: true },
  });
  const requiredIds = new Set(requiredQuestions.map((q) => q.id));
  const answeredIds = new Set(questionIds);
  const missingRequired = Array.from(requiredIds).filter(
    (id) => !answeredIds.has(id),
  );
  if (missingRequired.length > 0) {
    return errorResponse(
      "MISSING_REQUIRED",
      "Please answer all required questions.",
      400,
    );
  }

  const questionMap = new Map(
    questions.map((question) => [question.id, question]),
  );
  const validatedAnswers: Array<{
    questionId: string;
    value: unknown;
    richText: string | null;
  }> = [];

  for (const answer of body.answers) {
    const question = questionMap.get(answer.questionId);
    if (!question) {
      return errorResponse(
        "INVALID_QUESTION",
        "A question could not be validated.",
        400,
      );
    }
    const validation = await validateAnswerForQuestion(
      {
        type: question.type,
        isRequired: question.isRequired,
        options: question.options as QuestionnaireOptions,
      },
      { value: answer.value, richText: answer.richText },
    );

    if (!validation.ok) {
      return errorResponse("INVALID_ANSWER", validation.message, 400);
    }

    validatedAnswers.push({
      questionId: question.id,
      value: validation.value,
      richText: validation.richText ?? null,
    });
  }

  await db.$transaction(
    validatedAnswers.map((answer) =>
      db.questionnaireAnswer.upsert({
        where: {
          applicantId_questionId: {
            applicantId: applicationId,
            questionId: answer.questionId,
          },
        },
        update: {
          value:
            answer.value === null || answer.value === undefined
              ? Prisma.DbNull
              : (answer.value as Prisma.InputJsonValue),
          richText: answer.richText ?? null,
        },
        create: {
          applicantId: applicationId,
          questionId: answer.questionId,
          value:
            answer.value === null || answer.value === undefined
              ? Prisma.DbNull
              : (answer.value as Prisma.InputJsonValue),
          richText: answer.richText ?? null,
        },
      }),
    ),
  );

  return successResponse({ saved: true });
}
