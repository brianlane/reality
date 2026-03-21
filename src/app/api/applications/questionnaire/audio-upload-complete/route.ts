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
          // no-op
        } else {
          throw err;
        }
      }
    }

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

  const { error } = await supabase.functions.invoke(
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
    // Fast-fail this attempt so the client doesn't sit in "processing" timeout
    // when both webhook + manual trigger are unavailable.
    await db.questionnaireAnswer
      .updateMany({
        where: {
          applicantId: applicationId,
          questionId,
          voiceAudioPath: storagePath,
          OR: [{ voiceStatus: null }, { voiceStatus: { not: "transcribed" } }],
        },
        data: {
          voiceStatus: "failed",
          voiceErrorCode: "TRIGGER_FAILED",
        },
      })
      .catch(() => {
        // Best effort only; keep response successful.
      });
    return successResponse({ queued: false });
  }

  return successResponse({ queued: true });
}
