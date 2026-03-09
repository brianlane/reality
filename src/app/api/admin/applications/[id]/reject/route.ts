import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";
import { errorResponse, successResponse } from "@/lib/api-response";
import { sendApplicationStatusEmail } from "@/lib/email/status";
import { logger } from "@/lib/logger";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type RejectBody = {
  reason?: string;
};

const BACKGROUND_CHECK_KEYWORDS = [
  "background",
  "screening",
  "checkr",
  "idenfy",
  "criminal",
  "identity",
  "verification",
];

function isBackgroundCheckRelated(reason: string): boolean {
  const lower = reason.toLowerCase();
  return BACKGROUND_CHECK_KEYWORDS.some((keyword) => lower.includes(keyword));
}

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
    include: { user: { select: { email: true, firstName: true } } },
  });
  if (!existing) {
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  const applicant = await db.applicant.update({
    where: { id },
    data: {
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
      type: "MANUAL_ADJUSTMENT",
      targetId: applicant.id,
      targetType: "applicant",
      description: "Soft rejected applicant",
      metadata: { reason: body.reason },
    },
  });

  // FCRA adverse action: send notification when rejection is background-check-related
  const reason = body.reason ?? "";
  if (isBackgroundCheckRelated(reason)) {
    sendApplicationStatusEmail({
      to: existing.user.email,
      firstName: existing.user.firstName,
      status: "REJECTED",
      applicantId: applicant.id,
    }).catch((err) => {
      logger.error("Failed to send adverse action email", {
        applicantId: applicant.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  return successResponse({
    applicant: {
      id: applicant.id,
      applicationStatus: applicant.applicationStatus,
      rejectionReason: applicant.rejectionReason,
      reviewedAt: applicant.reviewedAt,
    },
  });
}
