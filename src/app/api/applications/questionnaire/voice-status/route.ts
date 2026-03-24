import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireInvitedApplicant } from "@/lib/questionnaire-access";
import { getSupabaseClient } from "@/lib/storage/client";
import { logger } from "@/lib/logger";

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
      voiceAudioPath: true,
      voiceStatus: true,
      voiceTranscript: true,
      voiceTranscribedAt: true,
      voiceProvider: true,
      voiceErrorCode: true,
    },
  });

  let effective = answer;

  // If local DB is still pending, attempt to read terminal state directly from
  // Supabase. This helps local debugging when Prisma points at a different DB.
  if (!answer?.voiceStatus || answer.voiceStatus === "processing") {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: remote, error } = await supabase
        .from("QuestionnaireAnswer")
        .select(
          "voiceAudioPath, voiceStatus, voiceTranscript, voiceTranscribedAt, voiceProvider, voiceErrorCode",
        )
        .eq("applicantId", applicationId)
        .eq("questionId", questionId)
        .maybeSingle();

      if (error) {
        logger.warn("voice-status: supabase fallback query failed", {
          applicationId,
          questionId,
          error: error.message,
        });
      } else if (remote?.voiceStatus && remote.voiceStatus !== "processing") {
        logger.info("voice-status: supabase fallback picked terminal status", {
          applicationId,
          questionId,
          localStatus: answer?.voiceStatus ?? null,
          remoteStatus: remote.voiceStatus,
          localPath: answer?.voiceAudioPath ?? null,
          remotePath: (remote.voiceAudioPath as string | null) ?? null,
        });
        effective = {
          voiceAudioPath: (remote.voiceAudioPath as string | null) ?? null,
          voiceStatus:
            (remote.voiceStatus as "processing" | "transcribed" | "failed") ??
            null,
          voiceTranscript: (remote.voiceTranscript as string | null) ?? null,
          voiceTranscribedAt:
            remote.voiceTranscribedAt != null
              ? new Date(String(remote.voiceTranscribedAt))
              : null,
          voiceProvider: (remote.voiceProvider as string | null) ?? null,
          voiceErrorCode: (remote.voiceErrorCode as string | null) ?? null,
        };
      }
    }
  }

  logger.info("voice-status: response", {
    applicationId,
    questionId,
    voiceStatus: effective?.voiceStatus ?? null,
    hasTranscript: Boolean(effective?.voiceTranscript),
    voiceProvider: effective?.voiceProvider ?? null,
    voiceErrorCode: effective?.voiceErrorCode ?? null,
  });

  return successResponse({
    voiceStatus: effective?.voiceStatus ?? null,
    voiceTranscript: effective?.voiceTranscript ?? null,
    voiceTranscribedAt: effective?.voiceTranscribedAt ?? null,
    voiceProvider: effective?.voiceProvider ?? null,
    voiceErrorCode: effective?.voiceErrorCode ?? null,
  });
}
