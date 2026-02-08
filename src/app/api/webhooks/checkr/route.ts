import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  verifyCheckrSignature,
  mapCheckrResult,
} from "@/lib/background-checks/checkr";
import { onCheckrComplete } from "@/lib/background-checks/orchestrator";
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
    logger.warn("Checkr webhook: applicant not found", {
      candidateId,
      reportId,
    });
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  const screeningStatus = mapCheckrResult(result);

  // Update the Checkr status and store report ID
  await db.applicant.update({
    where: { id: applicant.id },
    data: {
      checkrStatus: screeningStatus,
      checkrReportId: reportId,
    },
  });

  // Audit log
  await db.screeningAuditLog
    .create({
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
    })
    .catch((err: unknown) => {
      logger.warn("Failed to create screening audit log", {
        error: err instanceof Error ? err.message : String(err),
      });
    });

  logger.info("Checkr report completed", {
    applicantId: applicant.id,
    reportId,
    result,
    mappedStatus: screeningStatus,
  });

  // Trigger orchestrator for next steps (non-blocking)
  onCheckrComplete(applicant.id, screeningStatus, result).catch(
    (err: unknown) => {
      logger.error("Orchestrator onCheckrComplete failed", {
        applicantId: applicant.id,
        error: err instanceof Error ? err.message : String(err),
      });
    },
  );

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

  // Log for audit trail -- the report.completed event will do the real processing
  await db.screeningAuditLog
    .create({
      data: {
        userId: null,
        applicantId: applicant.id,
        action: "CHECKR_INVITATION_COMPLETED",
        metadata: {
          invitationId: data.id,
          candidateId,
        },
      },
    })
    .catch((err: unknown) => {
      logger.warn("Failed to create screening audit log", {
        error: err instanceof Error ? err.message : String(err),
      });
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

  // Log the monitoring alert for admin review
  await db.screeningAuditLog
    .create({
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
    })
    .catch((err: unknown) => {
      logger.warn("Failed to create screening audit log", {
        error: err instanceof Error ? err.message : String(err),
      });
    });

  logger.warn("Continuous monitoring alert received", {
    applicantId: applicant.id,
    candidateId,
    monitorStatus: data.status,
  });

  // TODO: Send admin notification email about the monitoring alert
  // This is a safety-critical event that requires admin attention

  return successResponse({ received: true, processed: true });
}
