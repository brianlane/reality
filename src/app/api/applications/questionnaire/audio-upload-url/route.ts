import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getSupabaseClient } from "@/lib/storage/client";
import { errorResponse, successResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { getAuthUser } from "@/lib/auth";
import {
  isMimeTypeAllowed,
  mimeTypeToExtension,
  VOICE_AUDIO_BUCKET,
  VOICE_MAX_FILE_SIZE_BYTES,
} from "@/lib/voice-config";
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

export async function POST(request: NextRequest) {
  let body: {
    applicationId?: string;
    questionId?: string;
    mimeType?: string;
    fileSize?: number;
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

  // Flag 2: validate codec
  if (!isMimeTypeAllowed(mimeType)) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Unsupported audio format. Accepted: webm, mp4, mpeg, wav, ogg.",
      400,
    );
  }

  // Flag 3: validate file size
  if (fileSize <= 0) {
    return errorResponse("VALIDATION_ERROR", "Audio file is empty.", 400);
  }
  if (fileSize > VOICE_MAX_FILE_SIZE_BYTES) {
    return errorResponse(
      "VALIDATION_ERROR",
      `Audio file too large. Maximum is ${VOICE_MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`,
      400,
    );
  }

  // Validate applicant ownership (mirrors requireInvitedApplicant in questionnaire route)
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

  // Mark voice as processing so the status poll has an initial state immediately.
  // Non-fatal: upload URL is still returned even if this write fails.
  await db.questionnaireAnswer
    .upsert({
      where: {
        applicantId_questionId: { applicantId: applicationId, questionId },
      },
      update: {
        voiceAudioPath: storagePath,
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
        voiceAudioPath: storagePath,
        voiceMimeType: mimeType,
        voiceStatus: "processing",
      },
    })
    .catch((err: unknown) => {
      logger.warn(
        "audio-upload-url: failed to mark voice as processing (non-fatal)",
        {
          applicantId: applicationId,
          questionId,
          error: err instanceof Error ? err.message : String(err),
        },
      );
    });

  logger.info("audio-upload-url: signed URL created", {
    storagePath,
    applicantId: applicationId,
    questionId,
  });

  return successResponse({ signedUrl: data.signedUrl, storagePath });
}
