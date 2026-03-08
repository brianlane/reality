import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  mapIdenfyStatus,
  verifyIdenfySignature,
} from "@/lib/background-checks/idenfy";
import { onIdenfyComplete } from "@/lib/background-checks/orchestrator";
import { notifyAdminIdenfyReviewing } from "@/lib/email/admin-notifications";
import { logger } from "@/lib/logger";

import type { IdenfyWebhookPayload } from "@/lib/background-checks/idenfy";

export async function POST(request: Request) {
  const signature = request.headers.get("x-idenfy-signature") ?? "";
  const payload = await request.text();

  if (!verifyIdenfySignature(signature, payload)) {
    logger.warn("iDenfy webhook signature verification failed");
    return errorResponse("FORBIDDEN", "Invalid signature", 403);
  }

  let body: IdenfyWebhookPayload;
  try {
    body = JSON.parse(payload);
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid JSON payload", 400, [
      { message: (error as Error).message },
    ]);
  }

  // iDenfy sends interim and final callbacks; only process final results
  if (!body.final) {
    logger.info("iDenfy interim webhook received, skipping", {
      scanRef: body.scanRef,
    });
    return successResponse({ received: true, processed: false });
  }

  const overallStatus = body.status?.overall;
  const scanRef = body.scanRef;
  const clientId = body.clientId;

  if (!overallStatus || !scanRef) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Missing status.overall or scanRef",
      400,
    );
  }

  // Look up applicant by scanRef, the reviewing sentinel, or clientId.
  // The reviewing sentinel (`reviewing:${scanRef}`) is written when a REVIEWING
  // + final webhook is first processed, so retries and subsequent resolution
  // webhooks (APPROVED/DENIED after human review) can still find the applicant.
  const reviewingSentinel = `reviewing:${scanRef}`;
  const applicant = await db.applicant.findFirst({
    where: {
      OR: [
        { idenfyVerificationId: scanRef },
        { idenfyVerificationId: reviewingSentinel },
        ...(clientId ? [{ id: clientId }] : []),
      ],
    },
  });

  if (!applicant) {
    // Return 200 so iDenfy does not retry indefinitely for a genuinely
    // missing applicant. The warning log alerts the team for investigation.
    logger.warn("iDenfy webhook: applicant not found", {
      scanRef,
      clientId,
    });
    return successResponse({ received: true, processed: false });
  }

  const screeningStatus = mapIdenfyStatus(overallStatus, { final: body.final });

  // Log to screening audit (always, even for soft-deleted — compliance requirement).
  // No .catch() — failures must return 500 so the provider retries; we cannot
  // proceed without a legally required record.
  await db.screeningAuditLog.create({
    data: {
      userId: null,
      applicantId: applicant.id,
      action: "IDENFY_WEBHOOK",
      metadata: {
        scanRef,
        overallStatus,
        mappedStatus: screeningStatus,
      },
    },
  });

  // Skip status updates and orchestration for soft-deleted applicants
  if (applicant.deletedAt) {
    logger.info("iDenfy webhook for soft-deleted applicant, skipping update", {
      applicantId: applicant.id,
      scanRef,
    });
    return successResponse({ received: true, processed: false });
  }

  // Atomically claim first-time processing. The guard strategy differs by
  // status to ensure idempotency for all webhook retry scenarios:
  //
  // Terminal (PASSED/FAILED):
  //   Guard: idenfyVerificationId IN [scanRef, reviewingSentinel]
  //     — accepts a prior REVIEWING sentinel so resolution webhooks (iDenfy
  //       APPROVED/DENIED after human review) can still process.
  //     — idenfyStatus PENDING/IN_PROGRESS ensures retries after a terminal
  //       write return count=0 (status left the allowed set).
  //   Data: restores idenfyVerificationId to scanRef (sentinel no longer needed).
  //
  // IN_PROGRESS / REVIEWING:
  //   Guard: idenfyVerificationId = scanRef (not the sentinel)
  //     — mirrors Checkr's { not: reportId } pattern: write a sentinel so the
  //       guard fails on retries (sentinel ≠ scanRef → count=0 → idempotent).
  //   Data: writes reviewingSentinel so retries cannot re-claim.
  //
  // Stale session webhooks (scanRef from an old session) are rejected in all
  // paths because the current idenfyVerificationId won't match.
  let claimed: { count: number };

  const isReviewing =
    screeningStatus === "IN_PROGRESS" &&
    overallStatus.toUpperCase() === "REVIEWING";

  if (isReviewing) {
    claimed = await db.applicant.updateMany({
      where: {
        id: applicant.id,
        idenfyVerificationId: scanRef, // must be original (not yet sentinel)
        idenfyStatus: { in: ["PENDING", "IN_PROGRESS"] },
      },
      data: {
        idenfyStatus: "IN_PROGRESS",
        idenfyVerificationId: reviewingSentinel, // sentinel prevents idempotent retries
      },
    });
  } else {
    claimed = await db.applicant.updateMany({
      where: {
        id: applicant.id,
        idenfyVerificationId: { in: [scanRef, reviewingSentinel] },
        idenfyStatus: { in: ["PENDING", "IN_PROGRESS"] },
      },
      data: {
        idenfyStatus: screeningStatus,
        idenfyVerificationId: scanRef, // restore original scanRef on terminal write
      },
    });
  }

  if (claimed.count === 0) {
    logger.info("iDenfy webhook already processed (idempotent retry)", {
      applicantId: applicant.id,
      scanRef,
    });
    return successResponse({ received: true, processed: false });
  }

  logger.info("iDenfy webhook processed", {
    applicantId: applicant.id,
    overallStatus,
    mappedStatus: screeningStatus,
  });

  // REVIEWING: alert admin on first delivery only (guarded by claimed.count > 0).
  // Fires after the idempotency claim so retries never re-send the email.
  if (isReviewing) {
    logger.warn(
      "iDenfy final webhook with REVIEWING status — manual admin follow-up required",
      { applicantId: applicant.id, scanRef },
    );
    notifyAdminIdenfyReviewing({
      applicantId: applicant.id,
      scanRef,
    }).catch((err: unknown) => {
      logger.warn("Failed to send admin alert for iDenfy REVIEWING status", {
        applicantId: applicant.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });
    // Return immediately. onIdenfyComplete is a no-op for IN_PROGRESS; calling it
    // risks a transient orchestrator error (e.g. findUnique) causing 500, which
    // triggers iDenfy retries. Retries hit the idempotency guard (count=0) and
    // return processed: false forever — the original 500 is unrecoverable.
    return successResponse({ received: true, processed: true });
  }

  // Await orchestrator so transient failures return 500 and trigger provider retry.
  // Fire-and-forget would leave applicants stuck in IN_PROGRESS with no recovery.
  try {
    await onIdenfyComplete(applicant.id, screeningStatus);
  } catch (err: unknown) {
    // Roll back idenfyStatus so the provider retry can re-claim. The terminal
    // claim set idenfyStatus to PASSED/FAILED and idenfyVerificationId to scanRef.
    // Rolling back to IN_PROGRESS re-opens the idenfyStatus guard while keeping
    // idenfyVerificationId as scanRef so the retry's terminal guard still matches.
    await db.applicant
      .updateMany({
        where: {
          id: applicant.id,
          idenfyStatus: screeningStatus,
          idenfyVerificationId: scanRef,
        },
        data: { idenfyStatus: "IN_PROGRESS" },
      })
      .catch((rollbackErr: unknown) => {
        logger.error(
          "Failed to roll back idenfyStatus after orchestrator failure — provider retry will be blocked; manual intervention required",
          {
            applicantId: applicant.id,
            scanRef,
            error:
              rollbackErr instanceof Error
                ? rollbackErr.message
                : String(rollbackErr),
          },
        );
      });
    logger.error("Orchestrator onIdenfyComplete failed", {
      applicantId: applicant.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(
      "ORCHESTRATION_FAILED",
      "Failed to process identity verification completion",
      500,
    );
  }

  return successResponse({ received: true, processed: true });
}
