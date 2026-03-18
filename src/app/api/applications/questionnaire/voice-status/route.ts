import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getAuthUser } from "@/lib/auth";
import {
  APP_STATUS,
  QUESTIONNAIRE_NON_RESEARCH_ALLOWED_STATUSES,
} from "@/lib/application-status";
import { ApplicationStatus } from "@prisma/client";
import { ERROR_MESSAGES } from "@/lib/error-messages";

const RESEARCH_ACCESS_STATUSES: ApplicationStatus[] = [
  APP_STATUS.RESEARCH_INVITED as ApplicationStatus,
  APP_STATUS.RESEARCH_IN_PROGRESS as ApplicationStatus,
];

export async function GET(request: NextRequest) {
  const applicationId = request.nextUrl.searchParams.get("applicationId") ?? "";
  const questionId = request.nextUrl.searchParams.get("questionId") ?? "";

  if (!applicationId || !questionId) {
    return errorResponse(
      "VALIDATION_ERROR",
      "applicationId and questionId are required.",
      400,
    );
  }

  // Validate applicant ownership before returning any transcript data
  const applicant = await db.applicant.findFirst({
    where: { id: applicationId, deletedAt: null },
    include: { user: { select: { email: true } } },
  });

  if (!applicant) {
    return errorResponse(
      "NOT_FOUND",
      ERROR_MESSAGES.APP_NOT_FOUND_OR_INVITED,
      404,
    );
  }

  const isResearchApplicant = RESEARCH_ACCESS_STATUSES.includes(
    applicant.applicationStatus,
  );

  if (isResearchApplicant) {
    if (!applicant.researchInvitedAt) {
      return errorResponse(
        "FORBIDDEN",
        ERROR_MESSAGES.APP_NOT_FOUND_OR_INVITED,
        403,
      );
    }
    const auth = await getAuthUser();
    if (
      auth?.email &&
      auth.email.toLowerCase() !== applicant.user.email.toLowerCase()
    ) {
      return errorResponse(
        "FORBIDDEN",
        ERROR_MESSAGES.OWN_APPLICATION_ONLY,
        403,
      );
    }
  } else {
    const nonResearchAllowed: ApplicationStatus[] = [
      ...QUESTIONNAIRE_NON_RESEARCH_ALLOWED_STATUSES,
    ];
    if (!nonResearchAllowed.includes(applicant.applicationStatus)) {
      return errorResponse(
        "FORBIDDEN",
        ERROR_MESSAGES.QUESTIONNAIRE_STATUS_UNAVAILABLE,
        403,
      );
    }
    const auth = await getAuthUser();
    if (!auth?.email) {
      return errorResponse(
        "UNAUTHORIZED",
        ERROR_MESSAGES.SIGN_IN_TO_CONTINUE,
        401,
      );
    }
    if (auth.email.toLowerCase() !== applicant.user.email.toLowerCase()) {
      return errorResponse(
        "FORBIDDEN",
        ERROR_MESSAGES.OWN_APPLICATION_ONLY,
        403,
      );
    }
  }

  const answer = await db.questionnaireAnswer.findUnique({
    where: {
      applicantId_questionId: { applicantId: applicationId, questionId },
    },
    select: {
      voiceStatus: true,
      voiceTranscript: true,
      voiceTranscribedAt: true,
      voiceProvider: true,
      voiceErrorCode: true,
    },
  });

  return successResponse({
    voiceStatus: answer?.voiceStatus ?? null,
    voiceTranscript: answer?.voiceTranscript ?? null,
    voiceTranscribedAt: answer?.voiceTranscribedAt ?? null,
    voiceProvider: answer?.voiceProvider ?? null,
    voiceErrorCode: answer?.voiceErrorCode ?? null,
  });
}
