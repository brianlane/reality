import { ApplicationStatus } from "@prisma/client";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { sendResearchInviteEmail } from "@/lib/email/research";
import { logger } from "@/lib/logger";
import { generateUniqueResearchInviteCode } from "@/lib/research/invite-code";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const RESEARCH_STATUSES: ApplicationStatus[] = [
  "RESEARCH_INVITED",
  "RESEARCH_IN_PROGRESS",
];

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthUser();
  if (!auth || !auth.email) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const { id } = await params;
  if (!id) {
    return errorResponse("VALIDATION_ERROR", "Applicant ID is required", 400);
  }

  const applicant = await db.applicant.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          firstName: true,
          email: true,
        },
      },
    },
  });

  if (!applicant || applicant.deletedAt) {
    return errorResponse("NOT_FOUND", "Research participant not found", 404);
  }

  if (!RESEARCH_STATUSES.includes(applicant.applicationStatus)) {
    return errorResponse(
      "INVALID_STATUS",
      "Participant is not in a research status.",
      400,
    );
  }

  let inviteCode = applicant.researchInviteCode;
  if (!inviteCode) {
    try {
      inviteCode = await generateUniqueResearchInviteCode(db);
    } catch (error) {
      return errorResponse(
        "INVITE_FAILED",
        error instanceof Error
          ? error.message
          : "Failed to generate research invite code.",
        500,
      );
    }
  }

  const updated = await db.applicant.update({
    where: { id: applicant.id },
    data: {
      researchInviteCode: inviteCode,
      researchInvitedAt: applicant.researchInvitedAt ?? new Date(),
    },
    include: {
      user: {
        select: {
          firstName: true,
          email: true,
        },
      },
    },
  });

  let emailSent = false;
  try {
    await sendResearchInviteEmail({
      to: updated.user.email,
      firstName: updated.user.firstName || "there",
      inviteCode: updated.researchInviteCode!,
      applicantId: updated.id,
    });
    emailSent = true;
  } catch (emailError) {
    logger.error("Failed to send research resume email", {
      error:
        emailError instanceof Error ? emailError.message : String(emailError),
      applicantId: updated.id,
      email: updated.user.email,
    });
  }

  return successResponse({
    applicantId: updated.id,
    inviteUrl: `${APP_URL}/research?code=${updated.researchInviteCode}`,
    emailSent,
  });
}
