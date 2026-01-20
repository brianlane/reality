import { ApplicationStatus } from "@prisma/client";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { ensureApplicantAccount } from "@/lib/account-init";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type WaitlistBody = {
  reason?: string;
  enabled?: boolean;
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

  const body = (await request.json()) as WaitlistBody;

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  const existing = await db.applicant.findFirst({
    where: { id, deletedAt: null },
    include: { user: true },
  });
  if (!existing) {
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  const waitlistStatuses = new Set<ApplicationStatus>([
    ApplicationStatus.WAITLIST,
    ApplicationStatus.WAITLIST_INVITED,
  ]);
  const isWaitlisted = waitlistStatuses.has(existing.applicationStatus);
  const enableWaitlist =
    typeof body.enabled === "boolean" ? body.enabled : !isWaitlisted;
  let nextStatus: ApplicationStatus = ApplicationStatus.SUBMITTED;

  if (enableWaitlist) {
    nextStatus = ApplicationStatus.WAITLIST;
  } else {
    const lastWaitlistAction = await db.adminAction.findFirst({
      where: {
        targetId: existing.id,
        targetType: "applicant",
        description: "Waitlisted applicant",
      },
      orderBy: { createdAt: "desc" },
    });

    const previousStatus =
      typeof lastWaitlistAction?.metadata === "object" &&
      lastWaitlistAction?.metadata &&
      "previousStatus" in lastWaitlistAction.metadata
        ? String(lastWaitlistAction.metadata.previousStatus)
        : null;

    const statusValues = Object.values(ApplicationStatus);
    nextStatus = statusValues.includes(previousStatus as ApplicationStatus)
      ? (previousStatus as ApplicationStatus)
      : ApplicationStatus.SUBMITTED;
  }

  if (enableWaitlist && existing.user.email) {
    const accountResult = await ensureApplicantAccount({
      email: existing.user.email,
      firstName: existing.user.firstName,
      lastName: existing.user.lastName,
    });

    if (accountResult.status === "error") {
      return errorResponse(
        "ACCOUNT_PROVISIONING_FAILED",
        "Unable to create applicant account. Try again later.",
        502,
      );
    }
  }

  const applicant = await db.applicant.update({
    where: { id },
    data: {
      applicationStatus: nextStatus,
      reviewedAt: new Date(),
      reviewedBy: adminUser.id,
      backgroundCheckNotes: enableWaitlist ? body.reason : null,
    },
  });

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "MANUAL_ADJUSTMENT",
      targetId: applicant.id,
      targetType: "applicant",
      description: enableWaitlist
        ? "Waitlisted applicant"
        : "Removed applicant from waitlist",
      metadata: enableWaitlist
        ? { reason: body.reason, previousStatus: existing.applicationStatus }
        : { removed: true },
    },
  });

  return successResponse({
    applicant: {
      id: applicant.id,
      applicationStatus: applicant.applicationStatus,
      reviewedAt: applicant.reviewedAt,
    },
  });
}
