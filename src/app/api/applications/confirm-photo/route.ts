import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSupabaseClient } from "@/lib/storage/client";
import { logger } from "@/lib/logger";
import { getAuthUser } from "@/lib/auth";
import { PHOTO_MAX_COUNT } from "@/lib/photo-config";

const PHOTO_BUCKET = "photos";

export async function POST(request: Request) {
  const auth = await getAuthUser();
  if (!auth?.email) {
    return errorResponse("UNAUTHORIZED", "Please sign in to continue.", 401);
  }

  let body: { applicantId?: string; storagePath?: string };
  try {
    body = await request.json();
  } catch {
    return errorResponse("VALIDATION_ERROR", "Invalid request body.", 400);
  }

  const { applicantId, storagePath } = body;

  if (!applicantId || !storagePath) {
    return errorResponse("VALIDATION_ERROR", "Missing required fields.", 400);
  }

  // Ensure the path belongs to this applicant (prefix must match)
  if (!storagePath.startsWith(`${applicantId}/`)) {
    return errorResponse(
      "FORBIDDEN",
      "Storage path does not belong to this applicant.",
      403,
    );
  }

  // Verify applicant ownership
  const applicant = await db.applicant.findUnique({
    where: { id: applicantId },
    select: {
      id: true,
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

  const supabase = getSupabaseClient();
  if (!supabase) {
    return errorResponse(
      "INTERNAL_SERVER_ERROR",
      "Storage is not configured",
      500,
    );
  }

  const { data: urlData } = supabase.storage
    .from(PHOTO_BUCKET)
    .getPublicUrl(storagePath);

  const photoUrl = urlData.publicUrl;

  try {
    const updated = await db.$transaction(async (tx) => {
      const currentApplicant = await tx.applicant.findUnique({
        where: { id: applicantId },
        select: { photos: true },
      });

      if (!currentApplicant) {
        throw new Error("Applicant not found");
      }

      if (currentApplicant.photos.length >= PHOTO_MAX_COUNT) {
        throw new Error("Photo limit exceeded by concurrent request");
      }

      return await tx.applicant.update({
        where: { id: applicantId },
        data: {
          photos: [...currentApplicant.photos, photoUrl],
        },
      });
    });

    logger.info("confirm-photo: photo saved", { applicantId, storagePath });

    return successResponse({
      photoUrl,
      applicantId: updated.id,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Clean up the orphaned file from storage since the DB write failed
    try {
      await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);
    } catch (cleanupError) {
      logger.error("confirm-photo: failed to clean up orphaned file", {
        storagePath,
        error:
          cleanupError instanceof Error
            ? cleanupError.message
            : String(cleanupError),
      });
    }

    if (errorMessage.includes("Applicant not found")) {
      return errorResponse("NOT_FOUND", "Applicant not found", 404);
    }

    if (errorMessage.includes("Photo limit exceeded")) {
      return errorResponse(
        "VALIDATION_ERROR",
        `Maximum of ${PHOTO_MAX_COUNT} photos allowed.`,
        400,
      );
    }

    throw error;
  }
}
