import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  verifyCheckrSignature,
  mapCheckrResult,
} from "@/lib/background-checks/checkr";
import { onCheckrComplete } from "@/lib/background-checks/orchestrator";
import { notifyAdminMonitoringAlert } from "@/lib/email/admin-notifications";
import { logger } from "@/lib/logger";

import type { CheckrWebhookPayload } from "@/lib/background-checks/checkr";

export async function POST(request: Request) {
  const signature = request.headers.get("x-checkr-signature") ?? "";
  const payload = await request.text();

  let signatureValid = false;
  try {
    signatureValid = verifyCheckrSignature(signature, payload);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorResponse(
      "FORBIDDEN",
      `Webhook verification failed: ${errorMessage}`,
      403,
    );
  }

  if (!signatureValid) {
    return errorResponse("FORBIDDEN", "Invalid signature", 403);
  }

  let body: CheckrWebhookPayload;
  try {
    body = JSON.parse(payload);
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid JSON payload", 400, [
      { message: (error as Error).message },
    ]);
  }

  const eventType = body.type;
  const eventData = body.data?.object;

  if (!eventType || !eventData) {
    return errorResponse("VALIDATION_ERROR", "Missing event type or data", 400);
  }

  logger.info("Checkr webhook received", {
    eventType,
    objectId: eventData.id,
  });

  // Route by event type
  switch (eventType) {
    case "report.completed":
      return handleReportCompleted(eventData);

    case "invitation.completed":
      return handleInvitationCompleted(eventData);

    case "continuous_monitor.updated":
      return handleContinuousMonitorUpdated(eventData);

    default:
      logger.info("Checkr webhook event type not handled", { eventType });
      return successResponse({ received: true, processed: false });
  }
}

// ============================================
// Event Handlers
// ============================================

async function handleReportCompleted(data: {
  id: string;
  result?: string;
  candidate_id?: string;
  status?: string;
  package?: string;
  [key: string]: unknown;
}) {
  const reportId = data.id;
  const result = data.result ?? null;
  const candidateId = data.candidate_id;

  if (!reportId) {
    logger.warn("Checkr report.completed missing report id");
    return errorResponse("VALIDATION_ERROR", "Missing report id", 400);
  }

  if (!candidateId) {
    logger.warn("Checkr report.completed missing candidate_id", { reportId });
    return errorResponse("VALIDATION_ERROR", "Missing candidate_id", 400);
  }

  // Look up applicant by Checkr candidate ID
  const applicant = await db.applicant.findFirst({
    where: {
      OR: [
        { checkrCandidateId: candidateId },
        // Fallback: try report ID
        { checkrReportId: reportId },
      ],
    },
  });

  if (!applicant) {
    // Return 200 so Checkr does not retry indefinitely for a genuinely
    // missing applicant. The warning log alerts the team for investigation.
    logger.warn("Checkr webhook: applicant not found", {
      candidateId,
      reportId,
    });
    return successResponse({ received: true, processed: false });
  }

  const screeningStatus = mapCheckrResult(result);

  // Audit log (always, even for soft-deleted — compliance requirement).
  // No .catch() — failures must return 500 so the provider retries; we cannot
  // proceed without a legally required record.
  await db.screeningAuditLog.create({
    data: {
      userId: null,
      applicantId: applicant.id,
      action: "CHECKR_REPORT_COMPLETED",
      metadata: {
        reportId,
        candidateId,
        result,
        mappedStatus: screeningStatus,
      },
    },
  });

  // Skip status updates and orchestration for soft-deleted applicants
  if (applicant.deletedAt) {
    logger.info(
      "Checkr report.completed for soft-deleted applicant, skipping update",
      { applicantId: applicant.id, reportId },
    );
    return successResponse({ received: true, processed: false });
  }

  // Update the Checkr status and store report ID
  await db.applicant.update({
    where: { id: applicant.id },
    data: {
      checkrStatus: screeningStatus,
      checkrReportId: reportId,
    },
  });

  logger.info("Checkr report completed", {
    applicantId: applicant.id,
    reportId,
    result,
    mappedStatus: screeningStatus,
  });

  // Await orchestrator so transient failures return 500 and trigger provider retry.
  // Fire-and-forget would leave applicants stuck in IN_PROGRESS with no recovery.
  try {
    await onCheckrComplete(applicant.id, screeningStatus, result);
  } catch (err: unknown) {
    logger.error("Orchestrator onCheckrComplete failed", {
      applicantId: applicant.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(
      "ORCHESTRATION_FAILED",
      "Failed to process report completion",
      500,
    );
  }

  return successResponse({ received: true, processed: true });
}

async function handleInvitationCompleted(data: {
  id: string;
  candidate_id?: string;
  [key: string]: unknown;
}) {
  const candidateId = data.candidate_id;
  if (!candidateId) {
    return successResponse({ received: true, processed: false });
  }

  const applicant = await db.applicant.findFirst({
    where: { checkrCandidateId: candidateId },
  });

  if (!applicant) {
    logger.warn("Checkr invitation.completed: applicant not found", {
      candidateId,
    });
    return successResponse({ received: true, processed: false });
  }

  // Log for audit trail — compliance requirement; failures must return 500.
  await db.screeningAuditLog.create({
    data: {
      userId: null,
      applicantId: applicant.id,
      action: "CHECKR_INVITATION_COMPLETED",
      metadata: {
        invitationId: data.id,
        candidateId,
      },
    },
  });

  logger.info("Checkr invitation completed", {
    applicantId: applicant.id,
    candidateId,
  });

  return successResponse({ received: true, processed: true });
}

async function handleContinuousMonitorUpdated(data: {
  id: string;
  candidate_id?: string;
  status?: string;
  [key: string]: unknown;
}) {
  const candidateId = data.candidate_id;
  if (!candidateId) {
    return successResponse({ received: true, processed: false });
  }

  const applicant = await db.applicant.findFirst({
    where: { checkrCandidateId: candidateId },
  });

  if (!applicant) {
    logger.warn("Checkr continuous_monitor.updated: applicant not found", {
      candidateId,
    });
    return successResponse({ received: true, processed: false });
  }

  // Log the monitoring alert — compliance requirement; failures must return 500.
  await db.screeningAuditLog.create({
    data: {
      userId: null,
      applicantId: applicant.id,
      action: "CONTINUOUS_MONITOR_ALERT",
      metadata: {
        monitorId: data.id,
        candidateId,
        status: data.status,
      },
    },
  });

  logger.warn("Continuous monitoring alert received", {
    applicantId: applicant.id,
    candidateId,
    monitorStatus: data.status,
  });

  notifyAdminMonitoringAlert({
    applicantId: applicant.id,
    candidateId,
    monitorStatus: data.status,
  }).catch((err: unknown) => {
    logger.warn("Failed to send admin monitoring alert notification", {
      applicantId: applicant.id,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  return successResponse({ received: true, processed: true });
}
