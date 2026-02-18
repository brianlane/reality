import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";
import { errorResponse, successResponse } from "@/lib/api-response";
import { APP_STATUS } from "@/lib/application-status";
import { type ApplicationStatus } from "@prisma/client";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const RESEARCH_STATUSES: Set<ApplicationStatus> = new Set([
  APP_STATUS.RESEARCH_INVITED,
  APP_STATUS.RESEARCH_IN_PROGRESS,
  APP_STATUS.RESEARCH_COMPLETED,
]);
const SKIP_PAYMENT_ELIGIBLE_STATUSES: Set<ApplicationStatus> = new Set([
  APP_STATUS.PAYMENT_PENDING,
]);

export async function POST(_: Request, { params }: RouteContext) {
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

  const existing = await db.applicant.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      applicationStatus: true,
      invitedOffWaitlistAt: true,
      waitlistInviteToken: true,
      softRejectedAt: true,
      softRejectedFromStatus: true,
    },
  });
  if (!existing) {
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  if (RESEARCH_STATUSES.has(existing.applicationStatus)) {
    return errorResponse(
      "INVALID_STATUS",
      "Skip payment is not available for research participants.",
      400,
    );
  }
  if (!SKIP_PAYMENT_ELIGIBLE_STATUSES.has(existing.applicationStatus)) {
    return errorResponse(
      "INVALID_STATUS",
      `Skip payment is only available for PAYMENT_PENDING applications. Current status: ${existing.applicationStatus}.`,
      400,
    );
  }

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  const invitedOffWaitlistAt = existing.invitedOffWaitlistAt ?? new Date();
  const applicant = await db.applicant.update({
    where: { id },
    data: {
      applicationStatus: APP_STATUS.DRAFT,
      invitedOffWaitlistAt,
      // Preserve any existing invite token; skip-payment does not mint new links.
      waitlistInviteToken: existing.waitlistInviteToken,
      softRejectedAt: null,
      softRejectedFromStatus: null,
      reviewedAt: new Date(),
      reviewedBy: adminUser.id,
    },
    select: {
      id: true,
      applicationStatus: true,
      invitedOffWaitlistAt: true,
    },
  });

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "MANUAL_ADJUSTMENT",
      targetId: applicant.id,
      targetType: "applicant",
      description: "Skipped payment and unlocked questionnaire",
      metadata: {
        previousStatus: existing.applicationStatus,
        nextStatus: APP_STATUS.DRAFT,
      },
    },
  });

  return successResponse({
    applicant: {
      id: applicant.id,
      applicationStatus: applicant.applicationStatus,
      invitedOffWaitlistAt: applicant.invitedOffWaitlistAt,
    },
  });
}
