import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";
import { errorResponse, successResponse } from "@/lib/api-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type OverrideBody = {
  override: boolean;
};

export async function PATCH(request: Request, { params }: RouteContext) {
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

  const body = (await request.json()) as OverrideBody;
  if (typeof body.override !== "boolean") {
    return errorResponse(
      "BAD_REQUEST",
      "Request body must include 'override' (boolean)",
      400,
    );
  }

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  const existing = await db.applicant.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) {
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  const applicant = await db.applicant.update({
    where: { id },
    data: {
      screeningFlagOverride: body.override,
      screeningFlagReviewedAt: new Date(),
      screeningFlagReviewedBy: adminUser.id,
    },
    select: {
      id: true,
      screeningFlagOverride: true,
      relationshipReadinessFlag: true,
      saScreeningFlag: true,
      screeningFlagReviewedAt: true,
    },
  });

  return successResponse({
    applicant: {
      id: applicant.id,
      screeningFlagOverride: applicant.screeningFlagOverride,
      relationshipReadinessFlag: applicant.relationshipReadinessFlag,
      saScreeningFlag: applicant.saScreeningFlag,
      reviewedAt: applicant.screeningFlagReviewedAt,
    },
  });
}
