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
      if (!body.id) {
        logger.warn(
          "Checkr continuous_monitor.updated missing top-level event id",
        );
        return successResponse({ received: true, processed: false });
      }
      return handleContinuousMonitorUpdated(eventData, body.id);

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

  // Look up applicant: prefer checkrCandidateId (primary), then checkrReportId
  // (fallback). Prefer non-deleted over soft-deleted to avoid writing to the
  // wrong record when multiple could match (e.g., re-trigger edge cases).
  // Use explicit deletedAt: null first, then fall back to any match, to avoid
  // relying on orderBy nulls ordering behavior across Prisma versions.
  let applicant = await db.applicant.findFirst({
    where: { checkrCandidateId: candidateId, deletedAt: null },
  });
  if (!applicant) {
    applicant = await db.applicant.findFirst({
      where: { checkrCandidateId: candidateId },
    });
  }
  if (!applicant) {
    applicant = await db.applicant.findFirst({
      where: { checkrReportId: reportId, deletedAt: null },
    });
  }
  if (!applicant) {
    applicant = await db.applicant.findFirst({
      where: { checkrReportId: reportId },
    });
  }

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

  // Soft-deleted: audit log for compliance, no status update. Use audit-log
  // existence check for idempotency (we cannot use updateMany since we skip it).
  if (applicant.deletedAt) {
    const existingLog = await db.screeningAuditLog.findFirst({
      where: {
        applicantId: applicant.id,
        action: "CHECKR_REPORT_COMPLETED",
        metadata: { path: ["reportId"], equals: reportId },
      },
    });
    if (existingLog) {
      logger.info(
        "Checkr report already processed (soft-deleted, idempotent retry)",
        {
          applicantId: applicant.id,
          reportId,
        },
      );
      return successResponse({ received: true, processed: false });
    }
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
    logger.info(
      "Checkr report.completed for soft-deleted applicant, audit logged",
      {
        applicantId: applicant.id,
        reportId,
      },
    );
    return successResponse({ received: true, processed: false });
  }

  // FCRA-required audit log before the claim. If audit fails, we return 500 and
  // the provider retries; the retry will create the audit (or find it exists).
  // Writing before the claim ensures that if the claim succeeds but a later step
  // fails, the retry hits the idempotency guard but the audit is already present.
  const existingAudit = await db.screeningAuditLog.findFirst({
    where: {
      applicantId: applicant.id,
      action: "CHECKR_REPORT_COMPLETED",
      metadata: { path: ["reportId"], equals: reportId },
    },
  });
  if (!existingAudit) {
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
  }

  // Atomically claim first-time processing for this specific report. The guard
  // uses { not: reportId } rather than null for two reasons:
  // 1. OR-fallback conflict: if the applicant was found via the checkrReportId
  //    fallback, checkrReportId is already reportId — a null guard would always
  //    match 0 rows, silently dropping the webhook without running the orchestrator.
  // 2. Re-trigger support: if an admin re-triggers after FAILED, checkrReportId
  //    holds the old report ID; a null guard would block the new report entirely.
  // { not: reportId } correctly handles all cases: first delivery (null ≠ reportId
  // → matches), re-trigger with old ID (old ≠ new → matches), and idempotent
  // retry of the same report (reportId = reportId → 0 rows → "already processed").
  const claimed = await db.applicant.updateMany({
    where: { id: applicant.id, checkrReportId: { not: reportId } },
    data: {
      checkrStatus: screeningStatus,
      checkrReportId: reportId,
    },
  });

  if (claimed.count === 0) {
    logger.info("Checkr report already processed (idempotent retry)", {
      applicantId: applicant.id,
      reportId,
    });
    return successResponse({ received: true, processed: false });
  }

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
    // Roll back the idempotency marker so the provider retry can re-claim.
    // Keep checkrStatus as-is — the mapped status is correct regardless of
    // orchestration state, and rolling it back could conflict with a concurrent
    // webhook for a different report.
    const previousReportId = applicant.checkrReportId;
    await db.applicant
      .updateMany({
        where: { id: applicant.id, checkrReportId: reportId },
        data: { checkrReportId: previousReportId },
      })
      .catch((rollbackErr: unknown) => {
        logger.error(
          "Failed to roll back checkrReportId after orchestrator failure — provider retry will be blocked; manual intervention required",
          {
            applicantId: applicant.id,
            reportId,
            error:
              rollbackErr instanceof Error
                ? rollbackErr.message
                : String(rollbackErr),
          },
        );
      });
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

  // Idempotency: skip if this exact invitation was already logged (retry scenario).
  const existingLog = await db.screeningAuditLog.findFirst({
    where: {
      applicantId: applicant.id,
      action: "CHECKR_INVITATION_COMPLETED",
      metadata: { path: ["invitationId"], equals: data.id },
    },
  });
  if (existingLog) {
    logger.info(
      "Checkr invitation.completed already logged (idempotent retry)",
      {
        applicantId: applicant.id,
        invitationId: data.id,
      },
    );
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

async function handleContinuousMonitorUpdated(
  data: {
    id: string;
    candidate_id?: string;
    status?: string;
    [key: string]: unknown;
  },
  eventId: string,
) {
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

  // Idempotency: skip if this exact webhook event was already logged.
  // We use the top-level event ID (body.id) — unique per delivery — rather than
  // data.id (the monitor subscription ID) which is shared across all alerts for
  // the same subscription. This avoids both false positives (dropping distinct
  // alerts within a time window) and false negatives (duplicate logs from retries
  // arriving after a time window expires).
  const existingAlert = await db.screeningAuditLog.findFirst({
    where: {
      applicantId: applicant.id,
      action: "CONTINUOUS_MONITOR_ALERT",
      metadata: {
        path: ["eventId"],
        equals: eventId,
      },
    },
  });
  if (existingAlert) {
    logger.info(
      "Continuous monitoring alert already processed (idempotent retry)",
      { applicantId: applicant.id, eventId, monitorId: data.id },
    );
    return successResponse({ received: true, processed: false });
  }

  // Log the monitoring alert — compliance requirement; failures must return 500.
  await db.screeningAuditLog.create({
    data: {
      userId: null,
      applicantId: applicant.id,
      action: "CONTINUOUS_MONITOR_ALERT",
      metadata: {
        eventId,
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
