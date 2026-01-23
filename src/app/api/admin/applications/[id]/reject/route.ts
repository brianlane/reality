import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";
import { errorResponse, successResponse } from "@/lib/api-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type RejectBody = {
  reason?: string;
};

export async function POST(request: Request, { params }: RouteContext) {
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

  const body = (await request.json()) as RejectBody;

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
      applicationStatus: "REJECTED",
      softRejectedAt: new Date(),
      softRejectedFromStatus:
        existing.softRejectedFromStatus ?? existing.applicationStatus,
      reviewedAt: new Date(),
      reviewedBy: adminUser.id,
      rejectionReason: body.reason ?? "Soft rejected",
    },
  });

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "REJECT_APPLICATION",
      targetId: applicant.id,
      targetType: "applicant",
      description: "Rejected applicant",
      metadata: { reason: body.reason },
    },
  });

  return successResponse({
    applicant: {
      id: applicant.id,
      applicationStatus: applicant.applicationStatus,
      rejectionReason: applicant.rejectionReason,
      reviewedAt: applicant.reviewedAt,
    },
  });
}
