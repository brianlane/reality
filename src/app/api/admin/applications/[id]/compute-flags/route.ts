import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { computeAndStoreScreeningFlags } from "@/lib/screening";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;
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

  const applicant = await db.applicant.findFirst({
    where: { id, deletedAt: null },
  });
  if (!applicant) {
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  const answerCount = await db.questionnaireAnswer.count({
    where: { applicantId: id },
  });
  if (answerCount === 0) {
    return errorResponse(
      "BAD_REQUEST",
      "Applicant has no questionnaire answers to analyze",
      400,
    );
  }

  const result = await computeAndStoreScreeningFlags(id);

  return successResponse({
    applicantId: id,
    relationshipReadiness: result.relationshipReadiness,
    saRisk: result.saRisk,
  });
}
