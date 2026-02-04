import { ApplicationStatus, Prisma, type Applicant } from "@prisma/client";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { applicantQuestionnaireSubmitSchema } from "@/lib/validations";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  QuestionnaireOptions,
  validateAnswerForQuestion,
} from "@/lib/questionnaire";
import { getAuthUser, requireAdmin } from "@/lib/auth";

const RESEARCH_STATUSES: ApplicationStatus[] = [
  "RESEARCH_INVITED",
  "RESEARCH_IN_PROGRESS",
];
const ALLOWED_STATUSES: ApplicationStatus[] = [
  "WAITLIST_INVITED",
  "PAYMENT_PENDING",
  "DRAFT",
  ...RESEARCH_STATUSES,
];

type InvitedApplicantResult =
  | { applicant: Applicant; isResearchMode: boolean }
  | { error: string };

async function requireInvitedApplicant(
  applicationId: string,
): Promise<InvitedApplicantResult> {
  const applicant = await db.applicant.findFirst({
    where: {
      id: applicationId,
      deletedAt: null,
    },
  });

  if (!applicant) {
    return { error: "Applicant not found or not invited." };
  }

  const isResearchApplicant = RESEARCH_STATUSES.includes(
    applicant.applicationStatus,
  );
  const hasInvite = isResearchApplicant
    ? !!applicant.researchInvitedAt
    : !!applicant.invitedOffWaitlistAt;

  if (!hasInvite) {
    return { error: "Applicant not found or not invited." };
  }

  if (!ALLOWED_STATUSES.includes(applicant.applicationStatus)) {
    return { error: "Questionnaire access is not available for this status." };
  }

  return { applicant, isResearchMode: isResearchApplicant };
}

export async function GET(request: NextRequest) {
  const applicationId = request.nextUrl.searchParams.get("applicationId") ?? "";
  const pageId = request.nextUrl.searchParams.get("pageId");
  // Preview mode can specify which mode to preview
  const previewModeParam = request.nextUrl.searchParams.get("previewMode");

  if (!applicationId) {
    return errorResponse(
      "MISSING_APPLICATION",
      "Application ID is required",
      400,
    );
  }

  // Allow preview mode to bypass applicant validation, but require admin auth
  const isPreviewMode = applicationId === "preview-mock-id";
  let isResearchMode = false;

  if (isPreviewMode) {
    // Preview mode requires admin authentication
    const auth = await getAuthUser();
    if (!auth) {
      return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
    }
    try {
      requireAdmin(auth.email);
    } catch (error) {
      return errorResponse("FORBIDDEN", (error as Error).message, 403);
    }
    // Allow previewing either mode
    isResearchMode = previewModeParam === "research";
  } else {
    // Regular mode requires invited applicant validation
    const access = await requireInvitedApplicant(applicationId);
    if ("error" in access) {
      return errorResponse("FORBIDDEN", access.error, 403);
    }
    isResearchMode = access.isResearchMode;
  }

  // Filter pages and sections based on participant mode
  // - Application participants see pages/sections where forResearch = false
  // - Research participants see pages/sections where forResearch = true
  const [pages, sections, answers] = await Promise.all([
    db.questionnairePage.findMany({
      where: {
        deletedAt: null,
        forResearch: isResearchMode,
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      select: { id: true, title: true, order: true },
    }),
    db.questionnaireSection.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        forResearch: isResearchMode,
        ...(pageId ? { pageId } : {}),
      },
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
    pages: pages.map((page) => ({
      id: page.id,
      title: page.title,
      order: page.order,
    })),
    currentPageId: pageId ?? undefined,
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
  const pageId = body.pageId;
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
      section: {
        deletedAt: null,
        isActive: true,
        ...(pageId ? { pageId } : {}),
      },
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
