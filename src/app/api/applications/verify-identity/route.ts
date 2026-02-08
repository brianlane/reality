import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { createVerificationSession } from "@/lib/background-checks/idenfy";
import { logger } from "@/lib/logger";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicationId } = body;

    if (!applicationId) {
      return errorResponse(
        "VALIDATION_ERROR",
        "applicationId is required",
        400,
      );
    }

    const applicant = await db.applicant.findUnique({
      where: { id: applicationId },
      include: { user: true },
    });

    if (!applicant) {
      return errorResponse("NOT_FOUND", "Application not found", 404);
    }

    // Must have FCRA consent before starting identity verification
    if (!applicant.backgroundCheckConsentAt) {
      return errorResponse(
        "CONSENT_REQUIRED",
        "Background check consent must be provided before identity verification",
        400,
      );
    }

    // Don't re-initiate if already in progress or completed
    if (
      applicant.idenfyStatus === "IN_PROGRESS" &&
      applicant.idenfyVerificationId
    ) {
      return successResponse({
        status: "already_in_progress",
        verificationId: applicant.idenfyVerificationId,
        message:
          "Identity verification is already in progress. Please complete the existing session.",
      });
    }

    if (applicant.idenfyStatus === "PASSED") {
      return successResponse({
        status: "already_passed",
        message: "Identity verification has already been completed.",
      });
    }

    // Create iDenfy verification session
    const session = await createVerificationSession({
      id: applicant.id,
      firstName: applicant.user.firstName,
      lastName: applicant.user.lastName,
    });

    // Store the verification ID and update status
    await db.applicant.update({
      where: { id: applicant.id },
      data: {
        idenfyVerificationId: session.scanRef,
        idenfyStatus: "IN_PROGRESS",
      },
    });

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
