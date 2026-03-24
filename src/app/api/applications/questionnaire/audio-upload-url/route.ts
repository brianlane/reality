import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getSupabaseClient } from "@/lib/storage/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import {
  isMimeTypeAllowed,
  mimeTypeToExtension,
  VOICE_AUDIO_BUCKET,
  VOICE_MAX_FILE_SIZE_BYTES,
} from "@/lib/voice-config";
import { requireInvitedApplicant } from "@/lib/questionnaire-access";

export async function POST(request: NextRequest) {
  let body: {
    applicationId?: string;
    questionId?: string;
    mimeType?: string;
    fileSize?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse("VALIDATION_ERROR", "Invalid request body.", 400);
  }

  const { applicationId, questionId, mimeType, fileSize } = body;

  if (!applicationId || !questionId || !mimeType || fileSize === undefined) {
    return errorResponse("VALIDATION_ERROR", "Missing required fields.", 400);
  }

  const normalizedFileSize =
    typeof fileSize === "number" ? fileSize : Number(fileSize);
  if (!Number.isFinite(normalizedFileSize)) {
    return errorResponse(
      "VALIDATION_ERROR",
      "fileSize must be a valid number.",
      400,
    );
  }

  // Flag 2: validate codec
  if (!isMimeTypeAllowed(mimeType)) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Unsupported audio format. Accepted: webm, mp4, mpeg, wav, ogg.",
      400,
    );
  }

  // Flag 3: validate file size
  if (normalizedFileSize <= 0) {
    return errorResponse("VALIDATION_ERROR", "Audio file is empty.", 400);
  }
  if (normalizedFileSize > VOICE_MAX_FILE_SIZE_BYTES) {
    return errorResponse(
      "VALIDATION_ERROR",
      `Audio file too large. Maximum is ${VOICE_MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`,
      400,
    );
  }

  // Validate applicant ownership
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

  // Validate question is an active TEXTAREA
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

  // Build deterministic storage path: applicationId/questionId/timestamp.ext
  const ext = mimeTypeToExtension(mimeType);
  const storagePath = `${applicationId}/${questionId}/${Date.now()}${ext}`;

  const supabase = getSupabaseClient();
  if (!supabase) {
    logger.error("audio-upload-url: Supabase storage client not configured");
    return errorResponse(
      "INTERNAL_SERVER_ERROR",
      "Storage is not configured.",
      500,
    );
  }

  const { data, error } = await supabase.storage
    .from(VOICE_AUDIO_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    logger.error("audio-upload-url: failed to create signed URL", {
      error: error?.message,
    });
    return errorResponse(
      "INTERNAL_SERVER_ERROR",
      "Failed to create upload URL.",
      500,
    );
  }

  // Reserve a row and mark it as pending upload. voiceAudioPath is intentionally
  // left null here — audio-upload-complete (called only after a successful PUT)
  // is the sole writer of voiceAudioPath. This prevents a stale path in the DB
  // when the storage upload fails or is cancelled after re-recording.
  try {
    await db.questionnaireAnswer.upsert({
      where: {
        applicantId_questionId: { applicantId: applicationId, questionId },
      },
      update: {
        voiceAudioPath: null,
        voiceMimeType: mimeType,
        voiceStatus: "processing",
        voiceTranscript: null,
        voiceTranscribedAt: null,
        voiceProvider: null,
        voiceErrorCode: null,
      },
      create: {
        applicantId: applicationId,
        questionId,
        value: Prisma.DbNull,
        voiceMimeType: mimeType,
        voiceStatus: "processing",
      },
    });
  } catch (err) {
    logger.error("audio-upload-url: failed to initialize voice answer row", {
      applicantId: applicationId,
      questionId,
      storagePath,
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(
      "INTERNAL_SERVER_ERROR",
      "Failed to initialize voice transcription. Please try again.",
      500,
    );
  }

  logger.info("audio-upload-url: signed URL created", {
    storagePath,
    applicantId: applicationId,
    questionId,
  });

  return successResponse({ signedUrl: data.signedUrl, storagePath });
}
