import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";
import { errorResponse, successResponse } from "@/lib/api-response";
import { sendWaitlistInviteEmail } from "@/lib/email/waitlist";
import { randomBytes } from "crypto";

type BatchInviteBody = {
  applicantIds: string[];
};

export async function POST(request: Request) {
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

  const body = (await request.json()) as BatchInviteBody;
  const { applicantIds } = body;

  if (!Array.isArray(applicantIds)) {
    return errorResponse("INVALID_INPUT", "applicantIds must be an array", 400);
  }

  if (applicantIds.length === 0) {
    return errorResponse(
      "INVALID_INPUT",
      "At least one applicant ID is required",
      400,
    );
  }

  if (applicantIds.length > 50) {
    return errorResponse(
      "INVALID_INPUT",
      "Maximum 50 applicants can be invited at once",
      400,
    );
  }

  const success: string[] = [];
  const failed: Array<{ id: string; reason: string }> = [];

  // Process each applicant
  for (const applicantId of applicantIds) {
    try {
      // Generate unique invite token
      const inviteToken = randomBytes(32).toString("hex");

      // Update applicant atomically
      const updateResult = await db.applicant.updateMany({
        where: {
          id: applicantId,
          applicationStatus: "WAITLIST",
          invitedOffWaitlistAt: null,
        },
        data: {
          invitedOffWaitlistAt: new Date(),
          invitedOffWaitlistBy: adminUser.id,
          waitlistInviteToken: inviteToken,
        },
      });

      if (updateResult.count === 0) {
        const existing = await db.applicant.findUnique({
          where: { id: applicantId },
        });

        if (!existing) {
          failed.push({ id: applicantId, reason: "Applicant not found" });
          continue;
        }

        if (existing.applicationStatus !== "WAITLIST") {
          failed.push({ id: applicantId, reason: "Not on waitlist" });
          continue;
        }

        failed.push({ id: applicantId, reason: "Already invited" });
        continue;
      }

      const applicant = await db.applicant.findUnique({
        where: { id: applicantId },
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
        failed.push({ id: applicantId, reason: "Applicant not found" });
        continue;
      }

      // Create AdminAction record
      await db.adminAction.create({
        data: {
          userId: adminUser.id,
          type: "BATCH_INVITE_WAITLIST",
          targetId: applicant.id,
          targetType: "applicant",
          description: `Batch invited ${applicant.user.firstName} off waitlist`,
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
        console.error(
          `Failed to send email to ${applicant.user.email}:`,
          emailError,
        );
        // Continue - email failure shouldn't fail the entire invite
      }

      success.push(applicantId);
    } catch (error) {
      console.error("Error processing applicant %s:", applicantId, error);
      failed.push({
        id: applicantId,
        reason: (error as Error).message || "Unknown error",
      });
    }
  }

  return successResponse({
    success,
    failed,
    summary: {
      total: applicantIds.length,
      succeeded: success.length,
      failed: failed.length,
    },
  });
}
