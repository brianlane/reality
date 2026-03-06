import { getAuthUser, isAdminEmail } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getApplicantByEmail } from "@/lib/applicant-helpers";

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  if (isAdminEmail(auth.email)) {
    return errorResponse("FORBIDDEN", "Applicant access required", 403);
  }

  if (!auth.email) {
    return errorResponse("UNAUTHORIZED", "Email not available", 401);
  }

  const applicant = await getApplicantByEmail(auth.email);

  if (!applicant) {
    return errorResponse("UNAUTHORIZED", "Applicant not found", 401);
  }

  return successResponse({
    id: applicant.id,
    status: applicant.applicationStatus,
    submittedAt: applicant.submittedAt,
    reviewedAt: applicant.reviewedAt,
  });
}
