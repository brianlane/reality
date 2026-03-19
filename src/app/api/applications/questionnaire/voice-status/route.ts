import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireInvitedApplicant } from "@/lib/questionnaire-access";

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
  const access = await requireInvitedApplicant(applicationId);
  if ("error" in access) {
    const code =
      access.statusCode === 401
        ? "UNAUTHORIZED"
        : access.statusCode === 404
          ? "NOT_FOUND"
          : "FORBIDDEN";
    return errorResponse(code, access.error, access.statusCode);
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
