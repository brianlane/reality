import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { ensureApplicantAccount } from "@/lib/account-init";

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
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const body = (await request.json()) as WaitlistBody;

  const adminUser =
    (await db.user.findUnique({ where: { clerkId: auth.userId } })) ??
    (await db.user.create({
      data: {
        clerkId: auth.userId,
        email: `${auth.userId}@mock.local`,
        firstName: "Admin",
        lastName: "User",
        role: "ADMIN",
      },
    }));

  const existing = await db.applicant.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!existing) {
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  const enableWaitlist =
    typeof body.enabled === "boolean"
      ? body.enabled
      : existing.applicationStatus !== "WAITLIST";
  const nextStatus = enableWaitlist ? "WAITLIST" : "SUBMITTED";

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
      metadata: enableWaitlist ? { reason: body.reason } : { removed: true },
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
