import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  mapIdenfyStatus,
  verifyIdenfySignature,
} from "@/lib/background-checks/idenfy";
import { onIdenfyComplete } from "@/lib/background-checks/orchestrator";
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
  let applicant = await db.applicant.findFirst({
    where: {
      OR: [
        { idenfyVerificationId: scanRef },
        ...(clientId ? [{ id: clientId }] : []),
      ],
    },
  });

  if (!applicant) {
    logger.warn("iDenfy webhook: applicant not found", {
      scanRef,
      clientId,
    });
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  const screeningStatus = mapIdenfyStatus(overallStatus);

  // Log to screening audit (always, even for soft-deleted — compliance requirement)
  await db.screeningAuditLog
    .create({
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
    })
    .catch((err: unknown) => {
      logger.warn("Failed to create screening audit log", {
        error: err instanceof Error ? err.message : String(err),
      });
    });

  // Skip status updates and orchestration for soft-deleted applicants
  if (applicant.deletedAt) {
    logger.info("iDenfy webhook for soft-deleted applicant, skipping update", {
      applicantId: applicant.id,
      scanRef,
    });
    return successResponse({ received: true, processed: false });
  }

  // Update the iDenfy status
  applicant = await db.applicant.update({
    where: { id: applicant.id },
    data: {
      idenfyStatus: screeningStatus,
      idenfyVerificationId: scanRef,
    },
  });

  logger.info("iDenfy webhook processed", {
    applicantId: applicant.id,
    overallStatus,
    mappedStatus: screeningStatus,
  });

  // Trigger orchestrator for next steps (non-blocking)
  onIdenfyComplete(applicant.id, screeningStatus).catch((err: unknown) => {
    logger.error("Orchestrator onIdenfyComplete failed", {
      applicantId: applicant.id,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  return successResponse({ received: true, processed: true });
}
