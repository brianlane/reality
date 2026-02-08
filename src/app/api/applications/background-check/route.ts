import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  createCandidate,
  createInvitation,
} from "@/lib/background-checks/checkr";
import { logger } from "@/lib/logger";

/**
 * POST /api/applications/background-check
 *
 * Triggers a Checkr background check for an applicant.
 * Can be called by the orchestrator (auto) or by an admin (manual).
 * Creates a Checkr candidate and sends them an invitation to complete
 * the background check via Checkr's hosted form.
 */
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

    // Don't re-initiate if already in progress or completed
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

    if (applicant.checkrStatus === "PASSED") {
      return successResponse({
        status: "already_passed",
        message: "Background check has already been completed successfully.",
      });
    }

    // Step 1: Create Checkr candidate
    let candidateId = applicant.checkrCandidateId;

    if (!candidateId) {
      const candidate = await createCandidate({
        firstName: applicant.user.firstName,
        lastName: applicant.user.lastName,
        email: applicant.user.email,
      });
      candidateId = candidate.id;

      await db.applicant.update({
        where: { id: applicant.id },
        data: { checkrCandidateId: candidateId },
      });
    }

    // Step 2: Create invitation (Checkr sends email to candidate)
    const invitation = await createInvitation(candidateId);

    // Update status to in progress
    await db.applicant.update({
      where: { id: applicant.id },
      data: {
        checkrStatus: "IN_PROGRESS",
      },
    });

    // Log to audit
    await db.screeningAuditLog
      .create({
        data: {
          userId: "system",
          applicantId: applicant.id,
          action: "CHECKR_INVITATION_SENT",
          metadata: {
            candidateId,
            invitationId: invitation.id,
            package: invitation.package,
          },
        },
      })
      .catch((err: unknown) => {
        logger.warn("Failed to create screening audit log", {
          error: err instanceof Error ? err.message : String(err),
        });
      });

    logger.info("Checkr background check initiated", {
      applicantId: applicant.id,
      candidateId,
      invitationId: invitation.id,
    });

    return successResponse({
      status: "invitation_sent",
      candidateId,
      invitationId: invitation.id,
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
