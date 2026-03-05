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

  // Process in chunks of 10 to avoid serverless timeouts on large datasets.
  const CHUNK_SIZE = 10;
  for (let i = 0; i < applicants.length; i += CHUNK_SIZE) {
    const chunk = applicants.slice(i, i + CHUNK_SIZE);
    const settled = await Promise.allSettled(
      chunk.map((a) => computeAndStoreScreeningFlags(a.id)),
    );
    for (let j = 0; j < chunk.length; j++) {
      const outcome = settled[j];
      const applicantId = chunk[j]!.id;
      if (outcome!.status === "fulfilled") {
        results.push({
          applicantId,
          readinessFlag: outcome!.value.relationshipReadiness.flag,
          saFlag: outcome!.value.saRisk.flag,
        });
      } else {
        errors.push({
          applicantId,
          error: (outcome!.reason as Error).message,
        });
      }
    }
  }

  return successResponse({
    processed: results.length,
    errors: errors.length,
    results,
    ...(errors.length > 0 ? { errorDetails: errors } : {}),
  });
}
