import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { requireInvitedApplicant } from "@/lib/questionnaire-access";
import { db } from "@/lib/db";
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
    // Non-fatal because storage webhook may still trigger naturally.
    return successResponse({ queued: false });
  }

  return successResponse({ queued: true });
}
