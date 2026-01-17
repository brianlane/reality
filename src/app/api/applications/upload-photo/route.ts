import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { supabase } from "@/lib/storage/client";

const PHOTO_BUCKET = "photos";

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

  const applicant = await db.applicant.findUnique({
    where: { id: applicantId },
  });

  if (!applicant) {
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  const path = `${applicantId}/${Date.now()}-${file.name}`;
  const buffer = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    return errorResponse("INTERNAL_SERVER_ERROR", "Upload failed", 500, [
      { message: error.message },
    ]);
  }

  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);

  const updated = await db.applicant.update({
    where: { id: applicantId },
    data: {
      photos: [...applicant.photos, data.publicUrl],
    },
  });

  return successResponse({
    photoUrl: data.publicUrl,
    applicantId: updated.id,
  });
}
