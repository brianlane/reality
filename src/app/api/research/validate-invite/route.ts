import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");

    if (!code) {
      return errorResponse("MISSING_CODE", "Invite code is required", 400);
    }

    const applicant = await db.applicant.findUnique({
      where: { researchInviteCode: code },
      include: {
        user: {
          select: {
            firstName: true,
          },
        },
      },
    });

    if (!applicant || applicant.deletedAt !== null) {
      return errorResponse(
        "INVALID_CODE",
        "Invalid or expired research invitation link",
        404,
      );
    }

    if (!applicant.researchInvitedAt) {
      return errorResponse(
        "INVALID_CODE",
        "Invalid or expired research invitation link",
        404,
      );
    }

    if (applicant.applicationStatus === "RESEARCH_COMPLETED") {
      return errorResponse(
        "ALREADY_COMPLETED",
        "This research questionnaire has already been completed",
        400,
      );
    }

    if (
      applicant.applicationStatus !== "RESEARCH_INVITED" &&
      applicant.applicationStatus !== "RESEARCH_IN_PROGRESS"
    ) {
      return errorResponse(
        "INVALID_STATUS",
        "This research invitation is no longer valid",
        400,
      );
    }

    if (
      applicant.applicationStatus === "RESEARCH_INVITED" ||
      (applicant.applicationStatus === "RESEARCH_IN_PROGRESS" &&
        !applicant.researchInviteUsedAt)
    ) {
      await db.applicant.update({
        where: { id: applicant.id },
        data: {
          applicationStatus: "RESEARCH_IN_PROGRESS",
          researchInviteUsedAt: applicant.researchInviteUsedAt ?? new Date(),
        },
      });
    }

    return successResponse({
      valid: true,
      firstName: applicant.user.firstName,
      applicationId: applicant.id,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Research invite validation error", {
      error: errorMessage,
    });
    return errorResponse(
      "VALIDATION_ERROR",
      "Failed to validate research invite",
      400,
      [{ message: errorMessage }],
    );
  }
}
