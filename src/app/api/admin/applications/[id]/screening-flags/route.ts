import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
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
    select: {
      relationshipReadinessFlag: true,
      saScreeningFlag: true,
      screeningFlagDetails: true,
      screeningFlagComputedAt: true,
      screeningFlagReviewedAt: true,
      screeningFlagReviewedBy: true,
      screeningFlagOverride: true,
    },
  });

  if (!applicant) {
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  return successResponse({ data: applicant });
}
