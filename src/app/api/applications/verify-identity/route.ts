import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { createVerificationSession } from "@/lib/background-checks/idenfy";
import { logger } from "@/lib/logger";

/**
 * POST /api/applications/verify-identity
 *
 * Initiates an iDenfy identity verification session for an applicant.
 * Requires authenticated user who owns the application.
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return errorResponse("UNAUTHORIZED", "Authentication Required", 401);
    }

    const body = await request.json();
    const { applicationId, forceNewSession } = body;

    if (!applicationId) {
      return errorResponse(
        "VALIDATION_ERROR",
        "applicationId is required",
        400,
      );
    }

    const applicant = await db.applicant.findFirst({
      where: { id: applicationId, deletedAt: null },
      include: { user: true },
    });

    if (!applicant) {
      return errorResponse("NOT_FOUND", "Application not found", 404);
    }

    // Verify the authenticated user owns this application
    if (applicant.user.email.toLowerCase() !== auth.email?.toLowerCase()) {
      return errorResponse("FORBIDDEN", "Access denied", 403);
    }

    // Must have FCRA consent before starting identity verification
    if (!applicant.backgroundCheckConsentAt) {
      return errorResponse(
        "CONSENT_REQUIRED",
        "Background check consent must be provided before identity verification",
        400,
      );
    }

    // Already completed
    if (applicant.idenfyStatus === "PASSED") {
      return successResponse({
        status: "already_passed",
        message: "Identity verification has already been completed.",
      });
    }

    // Already in progress with a session
    if (
      applicant.idenfyStatus === "IN_PROGRESS" &&
      applicant.idenfyVerificationId &&
      forceNewSession !== true
    ) {
      return successResponse({
        status: "already_in_progress",
        verificationId: applicant.idenfyVerificationId,
        canRetry: true,
        message:
          "Identity verification is already in progress. Please complete the existing session.",
      });
    }

    // Claim status in a deterministic order so failures can roll back to the
    // pre-claim state instead of always resetting to PENDING.
    let rollbackStatus: "PENDING" | "FAILED" | "IN_PROGRESS" | null = null;

    const claimedFromFailed = await db.applicant.updateMany({
      where: { id: applicant.id, idenfyStatus: "FAILED" },
      data: { idenfyStatus: "IN_PROGRESS" },
    });
    if (claimedFromFailed.count > 0) {
      rollbackStatus = "FAILED";
    } else {
      const claimedFromPending = await db.applicant.updateMany({
        where: { id: applicant.id, idenfyStatus: "PENDING" },
        data: { idenfyStatus: "IN_PROGRESS" },
      });
      if (claimedFromPending.count > 0) {
        rollbackStatus = "PENDING";
      } else if (forceNewSession === true) {
        const claimedFromInProgress = await db.applicant.updateMany({
          where: { id: applicant.id, idenfyStatus: "IN_PROGRESS" },
          data: { idenfyStatus: "IN_PROGRESS" },
        });
        if (claimedFromInProgress.count > 0) {
          rollbackStatus = "IN_PROGRESS";
        }
      }
    }

    if (!rollbackStatus) {
      // Another request already claimed the transition
      return successResponse({
        status: "already_in_progress",
        message:
          "Identity verification is already being initiated. Please wait.",
      });
    }

    // Create iDenfy verification session and store the verification ID.
    // Both steps are covered by the same try-catch so that if either fails,
    // the status rolls back and the user can retry. An orphaned iDenfy session
    // (created but not stored) is acceptable -- sessions expire automatically.
    let session;
    try {
      session = await createVerificationSession({
        id: applicant.id,
        firstName: applicant.user.firstName,
        lastName: applicant.user.lastName,
      });

      // Store the verification ID (status already IN_PROGRESS from atomic claim)
      await db.applicant.update({
        where: { id: applicant.id },
        data: { idenfyVerificationId: session.scanRef },
      });
    } catch (err) {
      // Roll back to the original pre-claim status.
      await db.applicant.updateMany({
        where: { id: applicant.id, idenfyStatus: "IN_PROGRESS" },
        data: { idenfyStatus: rollbackStatus },
      });
      throw err;
    }

    logger.info("iDenfy verification session created", {
      applicantId: applicant.id,
      scanRef: session.scanRef,
    });

    return successResponse({
      status: "session_created",
      authToken: session.authToken,
      verificationUrl: session.url,
      scanRef: session.scanRef,
    });
  } catch (error) {
    logger.error("Failed to create identity verification session", {
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to initiate identity verification",
      500,
    );
  }
}
