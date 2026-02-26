import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { Prisma } from "@prisma/client";
import {
  hasValidProlificParams,
  type ProlificParams,
  getProlificCompletionCode,
  isProlificPidUniqueViolation,
} from "@/lib/research/prolific";

/**
 * GET /api/research/validate-invite?code=XXX
 * Used for session recovery in QuestionnaireForm
 */
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

    // For GET (session recovery), just return the application info without updating
    return successResponse({
      valid: true,
      firstName: applicant.user.firstName,
      applicationId: applicant.id,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Research invite validation error (GET)", {
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

/**
 * POST /api/research/validate-invite
 * Used when user first arrives with invite code (may include Prolific params)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      code,
      prolificPid,
      prolificStudyId,
      prolificSessionId,
    }: { code: string } & ProlificParams = body;

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

    const hasProlific = hasValidProlificParams({
      prolificPid,
      prolificStudyId,
      prolificSessionId,
    });
    const prolificCompletionCode = hasProlific
      ? getProlificCompletionCode()
      : null;
    if (hasProlific && !prolificCompletionCode) {
      return errorResponse(
        "SERVER_MISCONFIGURED",
        "Prolific integration is temporarily unavailable. Please try again later.",
        503,
      );
    }

    // Prepare update data
    const updateData: Prisma.ApplicantUpdateInput = {
      applicationStatus: "RESEARCH_IN_PROGRESS",
      researchInviteUsedAt: applicant.researchInviteUsedAt ?? new Date(),
    };

    // Add Prolific data if params are valid
    if (hasProlific) {
      updateData.prolificPid = prolificPid;
      updateData.prolificStudyId = prolificStudyId;
      updateData.prolificSessionId = prolificSessionId;
      // Note: Completion code will be set later based on relationship status answer
    }

    const shouldInitializeResearchSession =
      applicant.applicationStatus === "RESEARCH_INVITED" ||
      (applicant.applicationStatus === "RESEARCH_IN_PROGRESS" &&
        !applicant.researchInviteUsedAt);
    const shouldPersistProlificParams =
      hasProlific &&
      (applicant.prolificPid !== prolificPid ||
        applicant.prolificStudyId !== prolificStudyId ||
        applicant.prolificSessionId !== prolificSessionId);

    if (shouldInitializeResearchSession || shouldPersistProlificParams) {
      await db.applicant.update({
        where: { id: applicant.id },
        data: updateData,
      });
    }

    return successResponse({
      valid: true,
      firstName: applicant.user.firstName,
      applicationId: applicant.id,
      // Return completion code for Prolific participants
      ...(prolificCompletionCode && {
        prolificCompletionCode,
      }),
    });
  } catch (error) {
    if (isProlificPidUniqueViolation(error)) {
      return errorResponse(
        "CONFLICT",
        "This Prolific participant ID is already in use.",
        409,
      );
    }
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
