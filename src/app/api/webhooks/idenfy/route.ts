import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  mapIdenfyStatus,
  verifyIdenfySignature,
} from "@/lib/background-checks/idenfy";
import { onIdenfyComplete } from "@/lib/background-checks/orchestrator";
import { notifyAdminCheckrFlagged } from "@/lib/email/admin-notifications";
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

  // Look up applicant by scanRef (idenfyVerificationId) or clientId (our applicant ID)
  const applicant = await db.applicant.findFirst({
    where: {
      OR: [
        { idenfyVerificationId: scanRef },
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

  // Atomically claim first-time processing. Two guards work together:
  // - idenfyVerificationId: scanRef — only the current active session is processed;
  //   stale webhooks from a previous session (after forceNewSession) are rejected.
  // - idenfyStatus PENDING/IN_PROGRESS — prevents re-running the orchestrator on
  //   webhook retries after a 500; once PASSED/FAILED is written, retries return 200.
  const claimed = await db.applicant.updateMany({
    where: {
      id: applicant.id,
      idenfyVerificationId: scanRef,
      idenfyStatus: { in: ["PENDING", "IN_PROGRESS"] },
    },
    data: {
      idenfyStatus: screeningStatus,
      idenfyVerificationId: scanRef,
    },
  });

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

  // REVIEWING on a final webhook means the session is under human review at
  // iDenfy and the outcome is not yet known. Alert the admin to follow up with
  // iDenfy and advance the applicant manually once resolved.
  if (overallStatus.toUpperCase() === "REVIEWING" && body.final) {
    logger.warn(
      "iDenfy final webhook with REVIEWING status — manual admin follow-up required",
      { applicantId: applicant.id, scanRef },
    );
    notifyAdminCheckrFlagged({
      applicantId: applicant.id,
      result:
        "iDenfy REVIEWING (manual review required — follow up with iDenfy)",
    }).catch((err: unknown) => {
      logger.warn("Failed to send admin alert for iDenfy REVIEWING status", {
        applicantId: applicant.id,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }

  // Await orchestrator so transient failures return 500 and trigger provider retry.
  // Fire-and-forget would leave applicants stuck in IN_PROGRESS with no recovery.
  try {
    await onIdenfyComplete(applicant.id, screeningStatus);
  } catch (err: unknown) {
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
