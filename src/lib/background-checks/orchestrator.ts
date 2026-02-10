/**
 * Screening Orchestrator
 *
 * Coordinates the background check pipeline:
 * 1. FCRA consent -> 2. iDenfy identity verification -> 3. Checkr background check -> 4. Finalize
 *
 * Each step is triggered by webhooks from the respective provider.
 */

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { enrollContinuousMonitoring } from "@/lib/background-checks/checkr";
import { triggerCheckrInvitation } from "@/lib/background-checks/checkr-trigger";
import { sendApplicationStatusEmail } from "@/lib/email/status";

// ============================================
// Step 1: Initiate Screening
// ============================================

/**
 * Entry point after FCRA consent is given and the application is submitted.
 * Sets the application to SCREENING_IN_PROGRESS and triggers iDenfy verification.
 */
export async function initiateScreening(applicantId: string): Promise<void> {
  const applicant = await db.applicant.findUnique({
    where: { id: applicantId },
    include: { user: true },
  });

  if (!applicant) {
    throw new Error(`Applicant not found: ${applicantId}`);
  }

  if (applicant.deletedAt) {
    logger.info("Skipping screening initiation for soft-deleted applicant", {
      applicantId,
    });
    return;
  }

  if (!applicant.backgroundCheckConsentAt) {
    throw new Error(`FCRA consent not provided for applicant: ${applicantId}`);
  }

  logger.info("Initiating screening pipeline", {
    applicantId,
    currentStatus: applicant.applicationStatus,
  });

  // Only transition to SCREENING_IN_PROGRESS from SUBMITTED to avoid
  // regressing later states (APPROVED, WAITLIST, etc.) if an admin acts
  // before this async function executes.
  const statusUpdate = await db.applicant.updateMany({
    where: {
      id: applicantId,
      applicationStatus: { in: ["SUBMITTED", "SCREENING_IN_PROGRESS"] },
    },
    data: {
      applicationStatus: "SCREENING_IN_PROGRESS",
      screeningStatus: "IN_PROGRESS",
    },
  });

  // Only send the email if the status actually transitioned. If updateMany
  // matched 0 rows, the application is already in a later state (e.g. APPROVED)
  // and sending a "screening in progress" email would confuse the applicant.
  if (statusUpdate.count > 0) {
    sendApplicationStatusEmail({
      to: applicant.user.email,
      firstName: applicant.user.firstName,
      status: "SCREENING_IN_PROGRESS",
      applicantId: applicant.id,
    }).catch((err: unknown) => {
      logger.warn("Failed to send screening status email", {
        applicantId,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  // Do NOT create iDenfy sessions here. The authToken/redirect URL is
  // short-lived and must be delivered directly to the applicant UI.
  // Session creation happens only in /api/applications/verify-identity.
  logger.info(
    "Screening initiated; waiting for applicant to start identity verification",
    { applicantId },
  );
}

// ============================================
// Step 2: iDenfy Complete
// ============================================

/**
 * Called by the iDenfy webhook when identity verification completes.
 * If passed, auto-triggers Checkr background check.
 * If failed, marks screening as failed and notifies admin.
 */
export async function onIdenfyComplete(
  applicantId: string,
  status: "PASSED" | "FAILED" | "IN_PROGRESS",
): Promise<void> {
  if (status === "IN_PROGRESS") {
    // Still processing, nothing to do
    return;
  }

  const applicant = await db.applicant.findUnique({
    where: { id: applicantId },
    include: { user: true },
  });

  if (!applicant) {
    throw new Error(`Applicant not found: ${applicantId}`);
  }

  if (applicant.deletedAt) {
    logger.info("Skipping iDenfy completion for soft-deleted applicant", {
      applicantId,
    });
    return;
  }

  logger.info("iDenfy complete, orchestrating next step", {
    applicantId,
    idenfyStatus: status,
  });

  if (status === "FAILED") {
    // Identity verification failed -- mark overall screening as failed
    await db.applicant.update({
      where: { id: applicantId },
      data: {
        screeningStatus: "FAILED",
        backgroundCheckNotes: appendNote(
          applicant.backgroundCheckNotes,
          "Identity verification failed",
        ),
      },
    });

    logger.warn("Identity verification failed for applicant", {
      applicantId,
    });
    return;
  }

  try {
    const result = await triggerCheckrInvitation({
      applicantId,
      applicantIdentity: {
        firstName: applicant.user.firstName,
        lastName: applicant.user.lastName,
        email: applicant.user.email,
      },
      audit: {
        userId: null,
        action: "CHECKR_AUTO_TRIGGERED",
        metadata: { triggeredBy: "idenfy_pass" },
      },
    });

    if (result.status === "already_in_progress") {
      logger.info("Checkr already initiated, skipping", { applicantId });
      return;
    }

    logger.info("Checkr background check auto-triggered after iDenfy pass", {
      applicantId,
      candidateId: result.candidateId,
      invitationId: result.invitationId,
    });
  } catch (err: unknown) {
    logger.error("Failed to auto-trigger Checkr after iDenfy pass", {
      applicantId,
      error: err instanceof Error ? err.message : String(err),
    });
    // Don't fail -- admin can trigger manually
  }
}

// ============================================
// Step 3: Checkr Complete
// ============================================

/**
 * Called by the Checkr webhook when background check report completes.
 * If clear, finalizes screening as passed.
 * If consider, flags for admin review.
 */
export async function onCheckrComplete(
  applicantId: string,
  status: "PASSED" | "FAILED",
  result: string | null,
): Promise<void> {
  const applicant = await db.applicant.findUnique({
    where: { id: applicantId },
    include: { user: true },
  });

  if (!applicant) {
    throw new Error(`Applicant not found: ${applicantId}`);
  }

  if (applicant.deletedAt) {
    logger.info("Skipping Checkr completion for soft-deleted applicant", {
      applicantId,
    });
    return;
  }

  logger.info("Checkr complete, orchestrating next step", {
    applicantId,
    checkrStatus: status,
    result,
  });

  if (status === "PASSED") {
    await finalizeScreening(applicantId);
  } else {
    // Non-clear result (e.g. "consider") -- mark screening as FAILED and flag
    // for admin review. Setting screeningStatus ensures dashboards accurately
    // reflect that the pipeline is complete and the applicant needs attention,
    // rather than appearing stuck in IN_PROGRESS indefinitely.
    await db.applicant.update({
      where: { id: applicantId },
      data: {
        screeningStatus: "FAILED",
        backgroundCheckNotes: appendNote(
          applicant.backgroundCheckNotes,
          `Checkr result: ${result || "consider"} -- requires admin review`,
        ),
      },
    });

    logger.warn("Checkr result requires admin review", {
      applicantId,
      result,
    });

    // TODO: Send admin notification about the flagged result
  }
}

// ============================================
// Step 4: Finalize Screening
// ============================================

/**
 * Aggregates both provider statuses and finalizes the screening outcome.
 * Both iDenfy and Checkr must pass for overall screening to pass.
 * Enrolls in continuous monitoring if both pass.
 */
async function finalizeScreening(applicantId: string): Promise<void> {
  const applicant = await db.applicant.findUnique({
    where: { id: applicantId },
    include: { user: true },
  });

  if (!applicant) {
    throw new Error(`Applicant not found: ${applicantId}`);
  }

  // Do not process soft-deleted applicants. A Checkr webhook may arrive
  // after an admin has soft-deleted the applicant; enrolling them in
  // continuous monitoring would incur ongoing costs and contradict the
  // admin's explicit deletion intent.
  if (applicant.deletedAt) {
    logger.info("Skipping finalization for soft-deleted applicant", {
      applicantId,
    });
    return;
  }

  const idenfyPassed = applicant.idenfyStatus === "PASSED";
  const checkrPassed = applicant.checkrStatus === "PASSED";

  if (idenfyPassed && checkrPassed) {
    // Both passed -- screening complete
    await db.applicant.update({
      where: { id: applicantId },
      data: {
        screeningStatus: "PASSED",
        backgroundCheckNotes: appendNote(
          applicant.backgroundCheckNotes,
          "All screening checks passed",
        ),
      },
    });

    logger.info("Screening finalized: PASSED", { applicantId });

    // Enroll in continuous monitoring (non-blocking).
    // Use atomic conditional update to prevent duplicate enrollments from
    // concurrent webhook deliveries.
    if (applicant.checkrCandidateId) {
      const monitorClaimed = await db.applicant.updateMany({
        where: {
          id: applicantId,
          continuousMonitoringId: null,
          checkrCandidateId: { not: null },
          deletedAt: null,
        },
        // Set a unique placeholder to claim the slot; replaced with real ID below.
        // Must be unique per applicant since continuousMonitoringId has @unique.
        data: { continuousMonitoringId: `enrolling-${applicantId}` },
      });

      if (monitorClaimed.count > 0) {
        enrollContinuousMonitoring(applicant.checkrCandidateId)
          .then(async (monitor) => {
            try {
              // Use updateMany with deletedAt guard so we don't overwrite
              // the null set by soft-delete. If the applicant was deleted
              // while enrollment was in-flight, we must NOT store the ID
              // (the subscription should be canceled manually).
              const stored = await db.applicant.updateMany({
                where: {
                  id: applicantId,
                  deletedAt: null,
                  continuousMonitoringId: `enrolling-${applicantId}`,
                },
                data: { continuousMonitoringId: monitor.id },
              });

              if (stored.count > 0) {
                logger.info("Continuous monitoring enrolled", {
                  applicantId,
                  monitorId: monitor.id,
                });
              } else {
                // Applicant was soft-deleted (or placeholder was already
                // replaced) during enrollment. Log the orphaned subscription
                // so it can be canceled manually.
                logger.error(
                  "Applicant deleted or placeholder changed during monitoring enrollment — orphaned subscription requires manual cancellation",
                  {
                    applicantId,
                    monitorId: monitor.id, // CRITICAL: real Checkr subscription ID
                  },
                );
              }
            } catch (dbErr: unknown) {
              // DB update failed AFTER the Checkr API succeeded.
              // Do NOT clear the placeholder -- it prevents duplicate enrollments.
              // Log the real monitoring ID at error level so it can be recovered manually.
              logger.error(
                "Failed to store monitoring ID after successful enrollment — manual recovery required",
                {
                  applicantId,
                  monitorId: monitor.id, // CRITICAL: real Checkr subscription ID
                  error: dbErr instanceof Error ? dbErr.message : String(dbErr),
                },
              );
            }
          })
          .catch(async (err: unknown) => {
            // API call failed — no Checkr subscription was created.
            // Clear the placeholder so enrollment can be retried.
            await db.applicant.update({
              where: { id: applicantId },
              data: { continuousMonitoringId: null },
            });
            logger.error("Failed to enroll continuous monitoring", {
              applicantId,
              error: err instanceof Error ? err.message : String(err),
            });
          });
      }
    }
  } else {
    // At least one failed
    const failedProvider = !idenfyPassed ? "iDenfy" : "Checkr";

    await db.applicant.update({
      where: { id: applicantId },
      data: {
        screeningStatus: "FAILED",
        backgroundCheckNotes: appendNote(
          applicant.backgroundCheckNotes,
          `Screening failed: ${failedProvider} did not pass`,
        ),
      },
    });

    logger.info("Screening finalized: FAILED", {
      applicantId,
      failedProvider,
    });
  }
}

// ============================================
// Helpers
// ============================================

function appendNote(existingNotes: string | null, newNote: string): string {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${newNote}`;
  return existingNotes ? `${existingNotes}\n${entry}` : entry;
}
