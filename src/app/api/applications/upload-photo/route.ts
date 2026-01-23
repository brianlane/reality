import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSupabaseClient } from "@/lib/storage/client";

const PHOTO_BUCKET = "photos";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PHOTOS_PER_APPLICANT = 10;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Magic numbers for file type verification
const FILE_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [
    [0xff, 0xd8, 0xff], // JPEG
  ],
  "image/png": [
    [0x89, 0x50, 0x4e, 0x47], // PNG
  ],
  "image/webp": [
    [0x52, 0x49, 0x46, 0x46], // RIFF (WebP container)
  ],
};

function verifyFileSignature(buffer: Uint8Array, mimeType: string): boolean {
  const signatures = FILE_SIGNATURES[mimeType];
  if (!signatures) return false;

  // Special handling for WebP - check RIFF at 0-3 and WEBP at 8-11
  if (mimeType === "image/webp") {
    return (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 && // RIFF
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50 // WEBP
    );
  }

  return signatures.some((signature) =>
    signature.every((byte, index) => buffer[index] === byte),
  );
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  const applicantId = formData.get("applicantId")?.toString();

  if (!file || !(file instanceof File) || !applicantId) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Missing file or applicantId",
      400,
    );
  }

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
      400,
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return errorResponse(
      "VALIDATION_ERROR",
      `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
      400,
    );
  }

  if (file.size === 0) {
    return errorResponse("VALIDATION_ERROR", "File is empty.", 400);
  }

  // Validate applicant exists and hasn't exceeded photo limit
  const applicant = await db.applicant.findUnique({
    where: { id: applicantId },
  });

  if (!applicant) {
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  if (applicant.photos.length >= MAX_PHOTOS_PER_APPLICANT) {
    return errorResponse(
      "VALIDATION_ERROR",
      `Maximum of ${MAX_PHOTOS_PER_APPLICANT} photos allowed.`,
      400,
    );
  }

  // Read file buffer and verify actual content matches declared MIME type
  const buffer = new Uint8Array(await file.arrayBuffer());

  if (!verifyFileSignature(buffer, file.type)) {
    return errorResponse(
      "VALIDATION_ERROR",
      "File content does not match declared file type.",
      400,
    );
  }

  // Sanitize filename to prevent path traversal
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${applicantId}/${Date.now()}-${sanitizedFilename}`;

  const supabase = getSupabaseClient();
  if (!supabase) {
    return errorResponse(
      "INTERNAL_SERVER_ERROR",
      "Storage is not configured",
      500,
    );
  }

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: false, // Don't overwrite existing files
      cacheControl: "3600",
    });

  if (error) {
    return errorResponse("INTERNAL_SERVER_ERROR", "Upload failed", 500, [
      { message: error.message },
    ]);
  }

  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);

  try {
    // Use transaction to prevent race condition (TOCTOU)
    const updated = await db.$transaction(async (tx) => {
      // Re-fetch applicant to get latest photo count
      const currentApplicant = await tx.applicant.findUnique({
        where: { id: applicantId },
        select: { photos: true },
      });

      if (
        !currentApplicant ||
        currentApplicant.photos.length >= MAX_PHOTOS_PER_APPLICANT
      ) {
        throw new Error("Photo limit exceeded by concurrent request");
      }

      return await tx.applicant.update({
        where: { id: applicantId },
        data: {
          photos: [...currentApplicant.photos, data.publicUrl],
        },
      });
    });

    return successResponse({
      photoUrl: data.publicUrl,
      applicantId: updated.id,
    });
  } catch (error) {
    // Cleanup orphaned file if database update fails
    await supabase.storage.from(PHOTO_BUCKET).remove([path]);

    if ((error as Error).message.includes("Photo limit exceeded")) {
      return errorResponse(
        "VALIDATION_ERROR",
        `Maximum of ${MAX_PHOTOS_PER_APPLICANT} photos allowed.`,
        400,
      );
    }

    throw error;
  }
}
