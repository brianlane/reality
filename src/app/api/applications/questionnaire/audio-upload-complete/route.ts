import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { requireInvitedApplicant } from "@/lib/questionnaire-access";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import {
  isMimeTypeAllowed,
  VOICE_AUDIO_BUCKET,
  VOICE_MAX_FILE_SIZE_BYTES,
} from "@/lib/voice-config";
import { getSupabaseClient } from "@/lib/storage/client";

type UploadCompleteBody = {
  applicationId?: string;
  questionId?: string;
  storagePath?: string;
  mimeType?: string;
  fileSize?: unknown;
};

export async function POST(request: NextRequest) {
  let body: UploadCompleteBody;
  try {
    body = (await request.json()) as UploadCompleteBody;
  } catch {
    return errorResponse("VALIDATION_ERROR", "Invalid request body.", 400);
  }

  const { applicationId, questionId, storagePath, mimeType, fileSize } = body;
  logger.info("audio-upload-complete: request received", {
    applicationId,
    questionId,
    storagePath,
    mimeType,
    fileSize,
  });
  if (!applicationId || !questionId || !storagePath || !mimeType) {
    return errorResponse("VALIDATION_ERROR", "Missing required fields.", 400);
  }

  if (!storagePath.startsWith(`${applicationId}/${questionId}/`)) {
    return errorResponse("VALIDATION_ERROR", "Invalid storage path.", 400);
  }

  if (!isMimeTypeAllowed(mimeType)) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Unsupported audio format. Accepted: webm, mp4, mpeg, wav, ogg.",
      400,
    );
  }

  const normalizedFileSize =
    typeof fileSize === "number" ? fileSize : Number(fileSize);
  if (
    !Number.isFinite(normalizedFileSize) ||
    normalizedFileSize <= 0 ||
    normalizedFileSize > VOICE_MAX_FILE_SIZE_BYTES
  ) {
    return errorResponse("VALIDATION_ERROR", "Invalid audio file size.", 400);
  }

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

  const question = await db.questionnaireQuestion.findFirst({
    where: {
      id: questionId,
      deletedAt: null,
      isActive: true,
      type: "TEXTAREA",
    },
    select: { id: true },
  });

  if (!question) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Voice input is only available for text response questions.",
      400,
    );
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    logger.error("audio-upload-complete: Supabase client not configured");
    return errorResponse(
      "INTERNAL_SERVER_ERROR",
      "Storage is not configured.",
      500,
    );
  }

  const payload = {
    type: "INSERT",
    table: "objects",
    schema: "storage",
    record: {
      id: `manual-${Date.now()}`,
      name: storagePath,
      bucket_id: VOICE_AUDIO_BUCKET,
      metadata: {
        mimetype: mimeType,
        size: normalizedFileSize,
      },
    },
  };

  // Ensure a row exists before invoking edge transcription. This avoids the
  // edge function needing INSERT privileges in production.
  //
  // Important: do not clobber a transcription result that has already completed
  // for this exact storagePath (webhook/manual trigger may race).
  //
  // Use an atomic update-first/create-fallback pattern:
  // 1) updateMany with a guard that preserves already-completed same-path rows
  // 2) if nothing updated, try create
  // 3) on unique conflict, another concurrent request created it — continue
  try {
    const { count: updatedRows } = await db.questionnaireAnswer.updateMany({
      where: {
        applicantId: applicationId,
        questionId,
        // Update whenever the row is not already "transcribed" for this exact
        // upload path. Use explicit OR so NULL voiceStatus rows are included.
        OR: [
          { voiceStatus: null },
          { voiceStatus: { not: "transcribed" } },
          { voiceAudioPath: { not: storagePath } },
        ],
      },
      data: {
        voiceAudioPath: storagePath,
        voiceMimeType: mimeType,
        voiceStatus: "processing",
        voiceTranscript: null,
        voiceTranscribedAt: null,
        voiceProvider: null,
        voiceErrorCode: null,
      },
    });

    if (updatedRows === 0) {
      try {
        await db.questionnaireAnswer.create({
          data: {
            applicantId: applicationId,
            questionId,
            value: Prisma.DbNull,
            voiceAudioPath: storagePath,
            voiceMimeType: mimeType,
            voiceStatus: "processing",
          },
        });
      } catch (err) {
        // Concurrent create race is expected under retries; treat as success.
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          logger.info(
            "audio-upload-complete: create raced (P2002), continuing",
            {
              applicationId,
              questionId,
              storagePath,
            },
          );
        } else {
          throw err;
        }
      }
    }
    logger.info("audio-upload-complete: row initialization completed", {
      applicationId,
      questionId,
      storagePath,
      updatedRows,
    });

    // Hard guarantee: edge function update path requires a row with matching
    // applicant/question and current storage path.
    const ensured = await db.questionnaireAnswer.findUnique({
      where: {
        applicantId_questionId: { applicantId: applicationId, questionId },
      },
      select: {
        id: true,
        voiceAudioPath: true,
      },
    });
    if (!ensured || ensured.voiceAudioPath !== storagePath) {
      logger.error("audio-upload-complete: failed to ensure answer row state", {
        applicationId,
        questionId,
        storagePath,
        ensuredVoiceAudioPath: ensured?.voiceAudioPath ?? null,
      });
      return errorResponse(
        "INTERNAL_SERVER_ERROR",
        "Failed to initialize transcription state.",
        500,
      );
    }
  } catch (err) {
    logger.error("audio-upload-complete: failed to upsert answer row", {
      applicationId,
      questionId,
      storagePath,
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(
      "INTERNAL_SERVER_ERROR",
      "Failed to initialize transcription state.",
      500,
    );
  }

  type EdgeResult = {
    status?: "transcribed" | "failed" | "skipped";
    transcript?: string;
    provider?: string;
    errorCode?: string;
  };

  const { error, data } = await supabase.functions.invoke<EdgeResult>(
    "transcribe-questionnaire-audio",
    { body: payload },
  );

  if (error) {
    logger.warn("audio-upload-complete: manual transcription trigger failed", {
      applicationId,
      questionId,
      storagePath,
      error: error.message,
    });
    // Fast-fail: mark as failed so the client doesn't wait out the full timeout.
    await db.questionnaireAnswer
      .updateMany({
        where: {
          applicantId: applicationId,
          questionId,
          voiceAudioPath: storagePath,
          OR: [{ voiceStatus: null }, { voiceStatus: { not: "transcribed" } }],
        },
        data: { voiceStatus: "failed", voiceErrorCode: "TRIGGER_FAILED" },
      })
      .catch(() => {});
    return successResponse({ queued: false });
  }

  const result = data as EdgeResult | null;
  logger.info("audio-upload-complete: edge function returned", {
    applicationId,
    questionId,
    storagePath,
    status: result?.status ?? null,
    hasTranscript: Boolean(result?.transcript),
    provider: result?.provider ?? null,
    errorCode: result?.errorCode ?? null,
  });

  // Write the transcription result via Prisma (same DB, avoids PostgREST
  // permission issues the edge function may encounter in some environments).
  if (result?.status === "transcribed" && result.transcript) {
    await db.questionnaireAnswer.updateMany({
      where: {
        applicantId: applicationId,
        questionId,
        voiceAudioPath: storagePath,
      },
      data: {
        voiceStatus: "transcribed",
        voiceTranscript: result.transcript,
        voiceProvider: result.provider ?? null,
        voiceTranscribedAt: new Date(),
        voiceErrorCode: null,
      },
    });
    logger.info("audio-upload-complete: transcription written to DB", {
      applicationId,
      questionId,
      storagePath,
      provider: result.provider ?? null,
    });
  } else if (result?.status === "failed") {
    await db.questionnaireAnswer.updateMany({
      where: {
        applicantId: applicationId,
        questionId,
        voiceAudioPath: storagePath,
        OR: [{ voiceStatus: null }, { voiceStatus: { not: "transcribed" } }],
      },
      data: {
        voiceStatus: "failed",
        voiceErrorCode: result.errorCode ?? "TRANSCRIPTION_FAILED",
      },
    });
    logger.info("audio-upload-complete: transcription failed, written to DB", {
      applicationId,
      questionId,
      storagePath,
      errorCode: result.errorCode ?? null,
    });
  } else if (result?.status === "skipped") {
    // Edge function skipped (e.g. wrong bucket). Leave status for webhook to handle.
    logger.warn("audio-upload-complete: edge function skipped transcription", {
      applicationId,
      questionId,
      storagePath,
    });
  } else {
    // Unexpected or null response — leave as "processing" so polling continues briefly.
    logger.warn("audio-upload-complete: unexpected edge function response", {
      applicationId,
      questionId,
      storagePath,
      result,
    });
  }

  return successResponse({ queued: true });
}
