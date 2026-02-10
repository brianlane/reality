import { db } from "@/lib/db";
import { getAuthUser, requireAdminRole } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { triggerCheckrInvitation } from "@/lib/background-checks/checkr-trigger";
import { logger } from "@/lib/logger";

/**
 * POST /api/applications/background-check
 *
 * Triggers a Checkr background check for an applicant.
 * Admin-only endpoint. The orchestrator triggers Checkr directly via internal
 * function calls, not through this HTTP route.
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return errorResponse("UNAUTHORIZED", "Authentication required", 401);
    }

    let adminUser;
    try {
      adminUser = await requireAdminRole(auth.email);
    } catch (error) {
      return errorResponse("FORBIDDEN", (error as Error).message, 403);
    }

    const body = await request.json();
    const { applicationId } = body;

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

    // Must have FCRA consent
    if (!applicant.backgroundCheckConsentAt) {
      return errorResponse(
        "CONSENT_REQUIRED",
        "Background check consent must be provided before running a background check",
        400,
      );
    }

    // Identity verification should pass first
    if (applicant.idenfyStatus !== "PASSED") {
      return errorResponse(
        "PREREQUISITE_FAILED",
        "Identity verification must be completed before background check",
        400,
      );
    }

    // Already completed
    if (applicant.checkrStatus === "PASSED") {
      return successResponse({
        status: "already_passed",
        message: "Background check has already been completed successfully.",
      });
    }

    // Already in progress with a candidate
    if (
      applicant.checkrStatus === "IN_PROGRESS" &&
      applicant.checkrCandidateId
    ) {
      return successResponse({
        status: "already_in_progress",
        candidateId: applicant.checkrCandidateId,
        message: "Background check is already in progress.",
      });
    }

    const result = await triggerCheckrInvitation({
      applicantId: applicant.id,
      applicantIdentity: {
        firstName: applicant.user.firstName,
        lastName: applicant.user.lastName,
        email: applicant.user.email,
      },
      audit: {
        userId: adminUser.userId,
        action: "CHECKR_INVITATION_SENT",
      },
    });

    if (result.status === "already_in_progress") {
      return successResponse({
        status: "already_in_progress",
        message: "Background check is already being initiated. Please wait.",
      });
    }

    logger.info("Checkr background check initiated", {
      applicantId: applicant.id,
      candidateId: result.candidateId,
      invitationId: result.invitationId,
    });

    return successResponse({
      status: "invitation_sent",
      candidateId: result.candidateId,
      invitationId: result.invitationId,
      message:
        "Background check invitation has been sent. The applicant will receive an email from Checkr.",
    });
  } catch (error) {
    logger.error("Failed to initiate background check", {
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to initiate background check",
      500,
    );
  }
}
