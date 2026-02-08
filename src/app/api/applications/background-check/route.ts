import { db } from "@/lib/db";
import { getAuthUser, requireAdminRole } from "@/lib/auth";
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

    // Atomically claim the PENDING/FAILED -> IN_PROGRESS transition to prevent
    // duplicate Checkr candidates/invitations from concurrent admin requests.
    const claimed = await db.applicant.updateMany({
      where: {
        id: applicant.id,
        checkrStatus: { in: ["PENDING", "FAILED"] },
      },
      data: { checkrStatus: "IN_PROGRESS" },
    });

    if (claimed.count === 0) {
      return successResponse({
        status: "already_in_progress",
        message: "Background check is already being initiated. Please wait.",
      });
    }

    // Step 1: Create Checkr candidate
    let candidateId = applicant.checkrCandidateId;

    try {
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

      // Log to audit
      await db.screeningAuditLog
        .create({
          data: {
            userId: adminUser.userId,
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
    } catch (err) {
      // Roll back so admin can retry
      await db.applicant.update({
        where: { id: applicant.id },
        data: { checkrStatus: "PENDING" },
      });
      throw err;
    }
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
