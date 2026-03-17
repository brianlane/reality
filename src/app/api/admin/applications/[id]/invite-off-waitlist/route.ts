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
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorResponse("FORBIDDEN", errorMessage, 403);
  }

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  const existing = await db.applicant.findFirst({
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

  if (!existing || !existing.user) {
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  if (
    existing.applicationStatus !== "WAITLIST" &&
    existing.applicationStatus !== "WAITLIST_INVITED"
  ) {
    return errorResponse(
      "INVALID_STATUS",
      "Applicant is not eligible for a waitlist invite",
      400,
    );
  }

  const shouldReuseToken =
    existing.applicationStatus === "WAITLIST_INVITED" &&
    !!existing.waitlistInviteToken;
  // Preserve current token on resend so failed email delivery never invalidates
  // a previously working link.
  const inviteToken = shouldReuseToken
    ? existing.waitlistInviteToken!
    : randomBytes(32).toString("hex");

  const applicant = await db.applicant.update({
    where: { id: existing.id },
    data: {
      applicationStatus: "WAITLIST_INVITED",
      invitedOffWaitlistAt: new Date(),
      invitedOffWaitlistBy: adminUser.id,
      ...(shouldReuseToken ? {} : { waitlistInviteToken: inviteToken }),
    },
    include: {
      user: {
        select: {
          email: true,
          firstName: true,
        },
      },
    },
  });

  // Create AdminAction record
  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "INVITE_OFF_WAITLIST",
      targetId: applicant.id,
      targetType: "applicant",
      description: `${shouldReuseToken ? "Resent invite to" : "Invited"} ${applicant.user.firstName} off waitlist`,
      metadata: { inviteToken, resent: shouldReuseToken },
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
    const errorMessage =
      emailError instanceof Error ? emailError.message : String(emailError);
    logger.error("Failed to send waitlist invite email", {
      applicantId: applicant.id,
      error: errorMessage,
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
