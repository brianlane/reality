import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSupabaseClient } from "@/lib/storage/client";
import { logger } from "@/lib/logger";
import { getAuthUser } from "@/lib/auth";
import { PHOTO_MAX_COUNT } from "@/lib/photo-config";

const PHOTO_BUCKET = "photos";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export async function POST(request: Request) {
  const auth = await getAuthUser();
  if (!auth?.email) {
    return errorResponse("UNAUTHORIZED", "Please sign in to continue.", 401);
  }

  let body: {
    applicantId?: string;
    filename?: string;
    mimeType?: string;
    fileSize?: number;
  };
  try {
    body = await request.json();
  } catch {
    return errorResponse("VALIDATION_ERROR", "Invalid request body.", 400);
  }

  const { applicantId, filename, mimeType, fileSize } = body;

  if (!applicantId || !filename || !mimeType || fileSize === undefined) {
    return errorResponse("VALIDATION_ERROR", "Missing required fields.", 400);
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Invalid file type. Only JPEG, PNG, WebP, and HEIC/HEIF images are allowed.",
      400,
    );
  }

  if (fileSize > MAX_FILE_SIZE) {
    return errorResponse(
      "VALIDATION_ERROR",
      `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
      400,
    );
  }

  if (fileSize === 0) {
    return errorResponse("VALIDATION_ERROR", "File is empty.", 400);
  }

  const applicant = await db.applicant.findUnique({
    where: { id: applicantId },
    select: {
      id: true,
      photos: true,
      user: { select: { email: true } },
    },
  });

  if (!applicant) {
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  if (
    !applicant.user?.email ||
    applicant.user.email.toLowerCase() !== auth.email.toLowerCase()
  ) {
    return errorResponse(
      "FORBIDDEN",
      "You can only upload photos for your own application.",
      403,
    );
  }

  if (applicant.photos.length >= PHOTO_MAX_COUNT) {
    return errorResponse(
      "VALIDATION_ERROR",
      `Maximum of ${PHOTO_MAX_COUNT} photos allowed.`,
      400,
    );
  }

  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${applicantId}/${Date.now()}-${sanitizedFilename}`;

  const supabase = getSupabaseClient();
  if (!supabase) {
    logger.error("upload-url: Supabase client not configured");
    return errorResponse(
      "INTERNAL_SERVER_ERROR",
      "Storage is not configured",
      500,
    );
  }

  const { data, error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    logger.error("upload-url: failed to create signed URL", {
      error: error?.message,
    });
    return errorResponse(
      "INTERNAL_SERVER_ERROR",
      "Failed to create upload URL",
      500,
    );
  }

  logger.info("upload-url: signed URL created", { storagePath });

  return successResponse({
    signedUrl: data.signedUrl,
    token: data.token,
    storagePath,
  });
}
