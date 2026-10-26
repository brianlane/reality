import { getAuthUser, isAdminEmail } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getApplicantByEmail } from "@/lib/applicant-helpers";

/**
 * Applicant-facing: list this applicant's own agent briefings.
 * Only APPLICANT-audience briefings are exposed here; curator briefings
 * stay in the admin surface.
 */
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

  const briefings = await db.briefing.findMany({
    where: {
      applicantId: applicant.id,
      audience: "APPLICANT",
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      audience: true,
      content: true,
      matchId: true,
      createdAt: true,
    },
  });

  return successResponse({ briefings });
}
