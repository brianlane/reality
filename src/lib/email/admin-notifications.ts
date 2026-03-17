/**
 * Admin Notifications
 *
 * Sends email notifications to administrators for critical events:
 * - Email delivery failures
 * - Research questionnaire completions
 * - Application submissions
 * - Screening status changes
 */

import { sendEmail } from "./client";
import { escapeHtml } from "./simple-status-view";
import { logger } from "@/lib/logger";

const EMAIL_ASSET_BASE_URL = (
  process.env.EMAIL_ASSET_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.realitymatchmaking.com"
).replace(/\/$/, "");

const APP_BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://www.realitymatchmaking.com"
).replace(/\/$/, "");

const formatEnumLabel = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

// ============================================
// Shared HTML wrapper + send helper
// ============================================

type TableRow = { label: string; value: string; valueStyle?: string };

interface AdminEmailContent {
  subject: string;
  headerBg: string;
  headerTitle: string;
  showLogo?: boolean;
  description: string;
  detailBg: string;
  detailBorder: string;
  detailTitleColor: string;
  detailTitle: string;
  rows: TableRow[];
  extraHtml?: string;
  ctaUrl?: string;
  ctaLabel?: string;
  ctaBg?: string;
  text: string;
  applicantId?: string;
}

function buildTableRows(rows: TableRow[]): string {
  return rows
    .map(
      (r) => `
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600; width: 140px;">${r.label}:</td>
            <td style="padding: 8px 0; ${r.valueStyle || "color: #1a2332;"}">${r.value}</td>
          </tr>`,
    )
    .join("");
}

function buildAdminEmailHtml(content: AdminEmailContent): string {
  const logoHtml = content.showLogo
    ? `<img
        src="${EMAIL_ASSET_BASE_URL}/email-logo.png"
        alt="Reality Matchmaking logo"
        width="60"
        height="60"
        style="display: inline-block; margin-bottom: 16px; border: 0; outline: none; text-decoration: none;"
      />`
    : "";

  const ctaHtml =
    content.ctaUrl && content.ctaLabel
      ? `<p style="margin: 24px 0 0;">
        <a href="${content.ctaUrl}" style="display: inline-block; background-color: ${content.ctaBg || "#1a2332"}; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 14px; border-radius: 6px;">
          ${content.ctaLabel}
        </a>
      </p>`
      : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(content.headerTitle)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="${content.headerBg}; padding: 32px 20px; text-align: center;">
      ${logoHtml}
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">${escapeHtml(content.headerTitle)}</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        ${content.description}
      </p>
      <div style="background-color: ${content.detailBg}; border-left: 4px solid ${content.detailBorder}; padding: 20px; margin: 24px 0; border-radius: 4px;">
        <h3 style="color: ${content.detailTitleColor}; margin: 0 0 16px; font-size: 16px; font-weight: 600;">${escapeHtml(content.detailTitle)}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${buildTableRows(content.rows)}
        </table>
      </div>
      ${content.extraHtml || ""}
      ${ctaHtml}
    </div>
    <div style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #718096; font-size: 12px; margin: 0;">Reality Matchmaking - Admin Notification</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

async function sendAdminNotification(
  content: AdminEmailContent,
  envVar: "NOTIFICATION_EMAIL" | "ADMIN_EMAIL" = "NOTIFICATION_EMAIL",
  logLabel: string,
): Promise<void> {
  const to = process.env[envVar];
  // #region agent log
  fetch("http://127.0.0.1:7384/ingest/5d3b9455-6cdd-4488-9517-e1b206ec1797", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "2bf863",
    },
    body: JSON.stringify({
      sessionId: "2bf863",
      runId: "research-complete-debug",
      hypothesisId: "H2",
      location:
        "src/lib/email/admin-notifications.ts:sendAdminNotification:env-check",
      message: "Admin notification environment check",
      data: {
        envVar,
        hasRecipientConfigured: Boolean(to),
        logLabel,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  if (!to) {
    const level = envVar === "ADMIN_EMAIL" ? "error" : "warn";
    logger[level](`${envVar} not configured - skipping ${logLabel}`);
    return;
  }

  try {
    // #region agent log
    fetch("http://127.0.0.1:7384/ingest/5d3b9455-6cdd-4488-9517-e1b206ec1797", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "2bf863",
      },
      body: JSON.stringify({
        sessionId: "2bf863",
        runId: "research-complete-debug",
        hypothesisId: "H3",
        location:
          "src/lib/email/admin-notifications.ts:sendAdminNotification:send-attempt",
        message: "Attempting admin notification send",
        data: {
          envVar,
          emailType: "STATUS_UPDATE",
          hasApplicantId: Boolean(content.applicantId),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    await sendEmail({
      to,
      subject: content.subject,
      html: buildAdminEmailHtml(content),
      text: content.text,
      emailType: "STATUS_UPDATE",
      applicantId: content.applicantId,
    });
    logger.info(`${logLabel} sent`, { to });
    // #region agent log
    fetch("http://127.0.0.1:7384/ingest/5d3b9455-6cdd-4488-9517-e1b206ec1797", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "2bf863",
      },
      body: JSON.stringify({
        sessionId: "2bf863",
        runId: "research-complete-debug",
        hypothesisId: "H4",
        location:
          "src/lib/email/admin-notifications.ts:sendAdminNotification:send-success",
        message: "Admin notification send completed",
        data: { logLabel, envVar },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  } catch (error) {
    logger.error(`Failed to send ${logLabel}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    // #region agent log
    fetch("http://127.0.0.1:7384/ingest/5d3b9455-6cdd-4488-9517-e1b206ec1797", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "2bf863",
      },
      body: JSON.stringify({
        sessionId: "2bf863",
        runId: "research-complete-debug",
        hypothesisId: "H4",
        location:
          "src/lib/email/admin-notifications.ts:sendAdminNotification:send-error",
        message: "Admin notification send failed",
        data: {
          logLabel,
          envVar,
          error: error instanceof Error ? error.message : String(error),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }
}

function adminAppUrl(applicantId: string): string {
  return `${APP_BASE_URL}/admin/applications/${encodeURIComponent(applicantId)}`;
}

// ============================================
// Notification functions
// ============================================

interface EmailFailureParams {
  recipientEmail: string;
  emailType: string;
  errorMessage: string;
  applicantId?: string;
}

export async function notifyAdminOfEmailFailure(params: EmailFailureParams) {
  const safeEmailType = escapeHtml(params.emailType);
  const safeRecipientEmail = escapeHtml(params.recipientEmail);
  const safeErrorMessage = escapeHtml(params.errorMessage);

  const rows: TableRow[] = [
    { label: "Email Type", value: safeEmailType },
    { label: "Recipient", value: safeRecipientEmail },
  ];
  if (params.applicantId) {
    rows.push({
      label: "Applicant ID",
      value: escapeHtml(params.applicantId),
      valueStyle: "color: #1a2332; font-family: monospace; font-size: 14px;",
    });
  }
  rows.push(
    {
      label: "Error",
      value: safeErrorMessage,
      valueStyle: "color: #991b1b; word-break: break-word;",
    },
    { label: "Time", value: new Date().toLocaleString() },
  );

  await sendAdminNotification(
    {
      subject: `\u26A0\uFE0F Email Delivery Failure: ${params.emailType}`,
      headerBg: "background-color: #dc2626",
      headerTitle: "Email Delivery Failed",
      showLogo: true,
      description:
        "An email failed to send after multiple retry attempts. Action may be required.",
      detailBg: "#fef2f2",
      detailBorder: "#dc2626",
      detailTitleColor: "#991b1b",
      detailTitle: "Failure Details",
      rows,
      extraHtml: `
      <div style="background-color: #fff7ed; border: 1px solid #fed7aa; padding: 16px; border-radius: 4px; margin: 24px 0;">
        <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
          <strong>Recommended Actions:</strong>
        </p>
        <ul style="color: #92400e; font-size: 14px; margin: 12px 0 0; padding-left: 20px; line-height: 1.6;">
          <li>Verify the recipient's email address is valid</li>
          <li>Check Resend dashboard for delivery status</li>
          <li>Review Resend API key configuration</li>
          <li>Contact the applicant through alternate means if urgent</li>
        </ul>
      </div>`,
      text:
        "EMAIL DELIVERY FAILED\n\n" +
        "An email failed to send after multiple retry attempts. Action may be required.\n\n" +
        "FAILURE DETAILS\n\n" +
        `Email Type: ${params.emailType}\n` +
        `Recipient: ${params.recipientEmail}\n` +
        (params.applicantId ? `Applicant ID: ${params.applicantId}\n` : "") +
        `Error: ${params.errorMessage}\n` +
        `Time: ${new Date().toLocaleString()}\n\n` +
        "RECOMMENDED ACTIONS\n\n" +
        "- Verify the recipient's email address is valid\n" +
        "- Check Resend dashboard for delivery status\n" +
        "- Review Resend API key configuration\n" +
        "- Contact the applicant through alternate means if urgent",
    },
    "ADMIN_EMAIL",
    "admin failure notification",
  );
}

interface QuestionnaireCompletedParams {
  applicantId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export async function notifyQuestionnaireCompleted(
  params: QuestionnaireCompletedParams,
) {
  await sendAdminNotification(
    {
      subject: "Research Questionnaire Completed",
      headerBg: "background: linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)",
      headerTitle: "Research Questionnaire Completed",
      showLogo: true,
      description: "A research participant has completed their questionnaire.",
      detailBg: "#f0fdf4",
      detailBorder: "#22c55e",
      detailTitleColor: "#166534",
      detailTitle: "Participant Details",
      rows: [
        {
          label: "Name",
          value: `${escapeHtml(params.firstName)} ${escapeHtml(params.lastName)}`,
        },
        { label: "Email", value: escapeHtml(params.email) },
        {
          label: "Applicant ID",
          value: escapeHtml(params.applicantId),
          valueStyle:
            "color: #1a2332; font-family: monospace; font-size: 14px;",
        },
        { label: "Completed At", value: new Date().toLocaleString() },
      ],
      text:
        "RESEARCH QUESTIONNAIRE COMPLETED\n\n" +
        "A research participant has completed their questionnaire.\n\n" +
        "PARTICIPANT DETAILS\n\n" +
        `Name: ${params.firstName} ${params.lastName}\n` +
        `Email: ${params.email}\n` +
        `Applicant ID: ${params.applicantId}\n` +
        `Completed At: ${new Date().toLocaleString()}`,
      applicantId: params.applicantId,
    },
    "NOTIFICATION_EMAIL",
    "questionnaire completion notification",
  );
}

interface ApplicationSubmittedParams {
  applicantId: string;
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  gender: string;
  location: string;
  incomeRange: string;
  firstPhotoUrl?: string;
}

export async function notifyApplicationSubmitted(
  params: ApplicationSubmittedParams,
) {
  const firstPhotoUrl = params.firstPhotoUrl?.trim() || null;
  const safeFirstPhotoUrl = firstPhotoUrl ? escapeHtml(firstPhotoUrl) : null;
  const url = adminAppUrl(params.applicantId);
  const safeUrl = escapeHtml(url);

  const photoHtml = safeFirstPhotoUrl
    ? `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 4px; margin: 24px 0;">
        <p style="color: #1a2332; font-size: 14px; margin: 0 0 12px; line-height: 1.6;">
          <strong>First Photo Preview</strong>
        </p>
        <img
          src="${safeFirstPhotoUrl}"
          alt="Applicant photo preview"
          style="display: block; width: 100%; max-width: 320px; height: auto; border-radius: 6px; border: 1px solid #e2e8f0;"
        />
      </div>`
    : "";

  await sendAdminNotification(
    {
      subject: "New Application Submitted",
      headerBg: "background: linear-gradient(135deg, #1a2332 0%, #2d3e50 100%)",
      headerTitle: "New Application Submitted",
      showLogo: true,
      description:
        "An applicant has submitted their full application and is ready for review.",
      detailBg: "#eff6ff",
      detailBorder: "#3b82f6",
      detailTitleColor: "#1e40af",
      detailTitle: "Applicant Details",
      rows: [
        {
          label: "Name",
          value: `${escapeHtml(params.firstName)} ${escapeHtml(params.lastName)}`,
        },
        { label: "Email", value: escapeHtml(params.email) },
        {
          label: "Applicant ID",
          value: escapeHtml(params.applicantId),
          valueStyle:
            "color: #1a2332; font-family: monospace; font-size: 14px;",
        },
        { label: "Age", value: String(params.age) },
        {
          label: "Gender",
          value: escapeHtml(formatEnumLabel(params.gender)),
        },
        { label: "Location", value: escapeHtml(params.location) },
        { label: "Salary Range", value: escapeHtml(params.incomeRange) },
        { label: "Submitted At", value: new Date().toLocaleString() },
      ],
      extraHtml:
        photoHtml +
        `
      <div style="background-color: #fff7ed; border: 1px solid #fed7aa; padding: 16px; border-radius: 4px; margin: 24px 0;">
        <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
          <strong>Action Required:</strong> Please review this application in the admin dashboard.
        </p>
      </div>`,
      ctaUrl: safeUrl,
      ctaLabel: "Admin Login / Review Application",
      text:
        "NEW APPLICATION SUBMITTED\n\n" +
        "An applicant has submitted their full application and is ready for review.\n\n" +
        "APPLICANT DETAILS\n\n" +
        `Name: ${params.firstName} ${params.lastName}\n` +
        `Email: ${params.email}\n` +
        `Applicant ID: ${params.applicantId}\n` +
        `Age: ${params.age}\n` +
        `Gender: ${formatEnumLabel(params.gender)}\n` +
        `Location: ${params.location}\n` +
        `Salary Range: ${params.incomeRange}\n` +
        `Submitted At: ${new Date().toLocaleString()}\n\n` +
        (firstPhotoUrl ? `First Photo: ${firstPhotoUrl}\n` : "") +
        `Admin Login / Review Link: ${url}\n\n` +
        "ACTION REQUIRED: Please review this application in the admin dashboard.",
      applicantId: params.applicantId,
    },
    "NOTIFICATION_EMAIL",
    "application submission notification",
  );
}

interface CheckrFlaggedParams {
  applicantId: string;
  result: string;
}

export async function notifyAdminCheckrFlagged(params: CheckrFlaggedParams) {
  const url = adminAppUrl(params.applicantId);

  await sendAdminNotification(
    {
      subject: `\u26A0\uFE0F Background Check Requires Review: ${params.result}`,
      headerBg: "background-color: #d97706",
      headerTitle: "Background Check Review Required",
      description:
        "A Checkr background check returned a result that requires admin review before a membership decision can be made.",
      detailBg: "#fff7ed",
      detailBorder: "#d97706",
      detailTitleColor: "#92400e",
      detailTitle: "Details",
      rows: [
        {
          label: "Applicant ID",
          value: escapeHtml(params.applicantId),
          valueStyle:
            "color: #1a2332; font-family: monospace; font-size: 14px;",
        },
        {
          label: "Checkr Result",
          value: escapeHtml(params.result),
          valueStyle: "color: #92400e; font-weight: 600;",
        },
        { label: "Time", value: new Date().toLocaleString() },
      ],
      ctaUrl: escapeHtml(url),
      ctaLabel: "Review Application",
      text:
        "BACKGROUND CHECK REVIEW REQUIRED\n\n" +
        "A Checkr background check returned a result that requires admin review.\n\n" +
        `Applicant ID: ${params.applicantId}\n` +
        `Checkr Result: ${params.result}\n` +
        `Time: ${new Date().toLocaleString()}\n\n` +
        `Review Application: ${url}`,
      applicantId: params.applicantId,
    },
    "NOTIFICATION_EMAIL",
    "Checkr flagged result notification",
  );
}

interface IdenfyReviewingParams {
  applicantId: string;
  scanRef: string;
}

export async function notifyAdminIdenfyReviewing(
  params: IdenfyReviewingParams,
) {
  const url = adminAppUrl(params.applicantId);

  await sendAdminNotification(
    {
      subject:
        "\u26A0\uFE0F Identity Verification Manual Review Required (iDenfy)",
      headerBg: "background-color: #d97706",
      headerTitle: "Identity Verification Manual Review Required",
      description:
        "An iDenfy identity verification session requires manual review. Follow up in the iDenfy dashboard to complete the verification.",
      detailBg: "#fff7ed",
      detailBorder: "#d97706",
      detailTitleColor: "#92400e",
      detailTitle: "Details",
      rows: [
        {
          label: "Applicant ID",
          value: escapeHtml(params.applicantId),
          valueStyle:
            "color: #1a2332; font-family: monospace; font-size: 14px;",
        },
        {
          label: "iDenfy Scan Ref",
          value: escapeHtml(params.scanRef),
          valueStyle: "color: #92400e; font-weight: 600;",
        },
        { label: "Time", value: new Date().toLocaleString() },
      ],
      ctaUrl: escapeHtml(url),
      ctaLabel: "Review Application",
      text:
        "IDENTITY VERIFICATION MANUAL REVIEW REQUIRED (IDENFY)\n\n" +
        "An iDenfy identity verification session requires manual review. Follow up in the iDenfy dashboard.\n\n" +
        `Applicant ID: ${params.applicantId}\n` +
        `iDenfy Scan Ref: ${params.scanRef}\n` +
        `Time: ${new Date().toLocaleString()}\n\n` +
        `Review Application: ${url}`,
      applicantId: params.applicantId,
    },
    "NOTIFICATION_EMAIL",
    "iDenfy REVIEWING notification",
  );
}

interface MonitoringAlertParams {
  applicantId: string;
  candidateId: string;
  monitorStatus: string | undefined;
}

export async function notifyAdminMonitoringAlert(
  params: MonitoringAlertParams,
) {
  const url = adminAppUrl(params.applicantId);

  await sendAdminNotification(
    {
      subject:
        "\uD83D\uDEA8 Continuous Monitoring Alert \u2014 Member Background Change",
      headerBg: "background-color: #dc2626",
      headerTitle: "Continuous Monitoring Alert",
      description:
        "Checkr's continuous monitoring has detected a new record for an active member. <strong>Immediate review is required.</strong>",
      detailBg: "#fef2f2",
      detailBorder: "#dc2626",
      detailTitleColor: "#991b1b",
      detailTitle: "Alert Details",
      rows: [
        {
          label: "Applicant ID",
          value: escapeHtml(params.applicantId),
          valueStyle:
            "color: #1a2332; font-family: monospace; font-size: 14px;",
        },
        {
          label: "Checkr Candidate",
          value: escapeHtml(params.candidateId),
          valueStyle:
            "color: #1a2332; font-family: monospace; font-size: 14px;",
        },
        {
          label: "Monitor Status",
          value: escapeHtml(params.monitorStatus ?? "unknown"),
          valueStyle: "color: #991b1b; font-weight: 600;",
        },
        { label: "Time", value: new Date().toLocaleString() },
      ],
      ctaUrl: escapeHtml(url),
      ctaLabel: "Review Member Application",
      ctaBg: "#dc2626",
      text:
        "CONTINUOUS MONITORING ALERT \u2014 MEMBER BACKGROUND CHANGE\n\n" +
        "Checkr's continuous monitoring has detected a new record. Immediate review required.\n\n" +
        `Applicant ID: ${params.applicantId}\n` +
        `Checkr Candidate: ${params.candidateId}\n` +
        `Monitor Status: ${params.monitorStatus ?? "unknown"}\n` +
        `Time: ${new Date().toLocaleString()}\n\n` +
        `Review Application: ${url}`,
      applicantId: params.applicantId,
    },
    "NOTIFICATION_EMAIL",
    "monitoring alert notification",
  );
}

interface ScreeningPassedParams {
  applicantId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export async function notifyAdminScreeningPassed(
  params: ScreeningPassedParams,
) {
  const url = adminAppUrl(params.applicantId);

  await sendAdminNotification(
    {
      subject: `${params.firstName} ${params.lastName} has passed all screening and is ready for your review`,
      headerBg: "background-color: #22c55e",
      headerTitle: "Screening Passed",
      showLogo: true,
      description:
        "An applicant has passed all screening checks (identity verification and background check) and is ready for your review.",
      detailBg: "#f0fdf4",
      detailBorder: "#22c55e",
      detailTitleColor: "#166534",
      detailTitle: "Applicant Details",
      rows: [
        {
          label: "Name",
          value: `${escapeHtml(params.firstName)} ${escapeHtml(params.lastName)}`,
        },
        { label: "Email", value: escapeHtml(params.email) },
        {
          label: "Applicant ID",
          value: escapeHtml(params.applicantId),
          valueStyle:
            "color: #1a2332; font-family: monospace; font-size: 14px;",
        },
        { label: "Completed At", value: new Date().toLocaleString() },
      ],
      ctaUrl: escapeHtml(url),
      ctaLabel: "Review Application",
      text:
        "SCREENING PASSED\n\n" +
        "An applicant has passed all screening checks and is ready for your review.\n\n" +
        `Name: ${params.firstName} ${params.lastName}\n` +
        `Email: ${params.email}\n` +
        `Applicant ID: ${params.applicantId}\n` +
        `Completed At: ${new Date().toLocaleString()}\n\n` +
        `Review Application: ${url}`,
      applicantId: params.applicantId,
    },
    "NOTIFICATION_EMAIL",
    "screening passed notification",
  );
}
