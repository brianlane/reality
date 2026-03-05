import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { computeAndStoreScreeningFlags } from "@/lib/screening";

export async function POST() {
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  if (!auth.email) {
    return errorResponse("UNAUTHORIZED", "Email not available", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const applicants = await db.applicant.findMany({
    where: {
      deletedAt: null,
      questionnaireAnswers: { some: {} },
    },
    select: { id: true },
  });

  const results: Array<{
    applicantId: string;
    readinessFlag: string;
    saFlag: string;
  }> = [];
  const errors: Array<{ applicantId: string; error: string }> = [];

  for (const applicant of applicants) {
    try {
      const result = await computeAndStoreScreeningFlags(applicant.id);
      results.push({
        applicantId: applicant.id,
        readinessFlag: result.relationshipReadiness.flag,
        saFlag: result.saRisk.flag,
      });
    } catch (err) {
      errors.push({
        applicantId: applicant.id,
        error: (err as Error).message,
      });
    }
  }

  return successResponse({
    processed: results.length,
    errors: errors.length,
    results,
    ...(errors.length > 0 ? { errorDetails: errors } : {}),
  });
}
