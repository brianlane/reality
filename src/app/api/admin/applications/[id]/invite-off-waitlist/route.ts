import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";
import { errorResponse, successResponse } from "@/lib/api-response";
import { sendWaitlistInviteEmail } from "@/lib/email/waitlist";
import { randomBytes } from "crypto";
import { logger } from "@/lib/logger";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  // Generate unique invite token (32-byte hex = 64 characters)
  const inviteToken = randomBytes(32).toString("hex");

  // Update applicant with invite details atomically
  const updateResult = await db.applicant.updateMany({
    where: {
      id,
      applicationStatus: "WAITLIST",
      invitedOffWaitlistAt: null,
      deletedAt: null,
    },
    data: {
      applicationStatus: "WAITLIST_INVITED",
      invitedOffWaitlistAt: new Date(),
      invitedOffWaitlistBy: adminUser.id,
      waitlistInviteToken: inviteToken,
    },
  });

  if (updateResult.count === 0) {
    const existing = await db.applicant.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existing) {
      return errorResponse("NOT_FOUND", "Applicant not found", 404);
    }

    if (existing.invitedOffWaitlistAt) {
      return errorResponse(
        "ALREADY_INVITED",
        "Applicant has already been invited off the waitlist",
        400,
      );
    }

    if (existing.applicationStatus !== "WAITLIST") {
      return errorResponse(
        "INVALID_STATUS",
        "Applicant is not on the waitlist",
        400,
      );
    }

    // Should not reach here - updateMany failed for unknown reason
    return errorResponse("UNKNOWN_ERROR", "Failed to invite applicant", 500);
  }

  const applicant = await db.applicant.findFirst({
    where: { id, deletedAt: null },
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
        },
      },
    },
  });

  if (!applicant || !applicant.user) {
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  // Create AdminAction record
  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "INVITE_OFF_WAITLIST",
      targetId: applicant.id,
      targetType: "applicant",
      description: `Invited ${applicant.user.firstName} off waitlist`,
      metadata: { inviteToken },
    },
  });

  // Send invitation email
  try {
    await sendWaitlistInviteEmail({
      to: applicant.user.email,
      firstName: applicant.user.firstName,
      inviteToken,
    });
  } catch (emailError) {
    logger.error("Failed to send waitlist invite email", {
      applicantId: applicant.id,
      error: (emailError as Error).message,
    });
    // Continue even if email fails - admin can resend manually
  }

  const inviteUrl = `${APP_URL}/apply/continue?token=${inviteToken}`;

  return successResponse({
    success: true,
    applicantId: applicant.id,
    inviteUrl,
    invitedAt: applicant.invitedOffWaitlistAt,
  });
}
