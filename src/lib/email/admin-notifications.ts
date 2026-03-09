/**
 * Admin Notifications
 *
 * Sends email notifications to administrators for critical events:
 * - Email delivery failures
 * - Research questionnaire completions
 * - Application submissions
 */

import { sendEmail } from "./client";
import { escapeHtml } from "./simple-status-view";
import { logger } from "@/lib/logger";

const EMAIL_ASSET_BASE_URL = (
  process.env.EMAIL_ASSET_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.realitymatchmaking.com"
).replace(/\/$/, "");

interface EmailFailureParams {
  recipientEmail: string;
  emailType: string;
  errorMessage: string;
  applicantId?: string;
}

interface QuestionnaireCompletedParams {
  applicantId: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ScreeningPassedParams {
  applicantId: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface CheckrFlaggedParams {
  applicantId: string;
  result: string;
}

interface IdenfyReviewingParams {
  applicantId: string;
  scanRef: string;
}

interface MonitoringAlertParams {
  applicantId: string;
  candidateId: string;
  monitorStatus: string | undefined;
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

const APP_BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://www.realitymatchmaking.com"
).replace(/\/$/, "");

const formatEnumLabel = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

export async function notifyAdminOfEmailFailure(params: EmailFailureParams) {
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    logger.error(
      "ADMIN_EMAIL not configured - cannot send failure notification",
    );
    return;
  }

  const safeEmailType = escapeHtml(params.emailType);
  const safeRecipientEmail = escapeHtml(params.recipientEmail);
  const safeErrorMessage = escapeHtml(params.errorMessage);
  const safeApplicantId = params.applicantId
    ? escapeHtml(params.applicantId)
    : null;

  const subject = `⚠️ Email Delivery Failure: ${params.emailType}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeEmailType}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background-color: #dc2626; padding: 32px 20px; text-align: center;">
      <img
        src="${EMAIL_ASSET_BASE_URL}/email-logo.png"
        alt="Reality Matchmaking logo"
        width="60"
        height="60"
        style="display: inline-block; margin-bottom: 16px; border: 0; outline: none; text-decoration: none;"
      />
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Email Delivery Failed</h1>
    </div>

    <!-- Content -->
    <div style="padding: 32px;">
      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        An email failed to send after multiple retry attempts. Action may be required.
      </p>

      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 24px 0; border-radius: 4px;">
        <h3 style="color: #991b1b; margin: 0 0 16px; font-size: 16px; font-weight: 600;">Failure Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600; width: 140px;">Email Type:</td>
            <td style="padding: 8px 0; color: #1a2332;">${safeEmailType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Recipient:</td>
            <td style="padding: 8px 0; color: #1a2332;">${safeRecipientEmail}</td>
          </tr>
          ${
            safeApplicantId
              ? `
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Applicant ID:</td>
            <td style="padding: 8px 0; color: #1a2332; font-family: monospace; font-size: 14px;">${safeApplicantId}</td>
          </tr>
          `
              : ""
          }
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Error:</td>
            <td style="padding: 8px 0; color: #991b1b; word-break: break-word;">${safeErrorMessage}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Time:</td>
            <td style="padding: 8px 0; color: #1a2332;">${new Date().toLocaleString()}</td>
          </tr>
        </table>
      </div>

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
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #718096; font-size: 12px; margin: 0;">
        Reality Matchmaking - Admin Notification System
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text =
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
    "- Contact the applicant through alternate means if urgent";

  try {
    await sendEmail({
      to: adminEmail,
      subject,
      html,
      text,
      emailType: "STATUS_UPDATE", // Using STATUS_UPDATE as a general admin notification type
    });
    logger.info("Admin notification sent successfully");
  } catch (error) {
    logger.error("Failed to send admin notification", {
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - this is a notification about a failure, we don't want to create a cascade
  }
}

export async function notifyQuestionnaireCompleted(
  params: QuestionnaireCompletedParams,
) {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;

  if (!notificationEmail) {
    logger.warn(
      "NOTIFICATION_EMAIL not configured - skipping questionnaire completion notification",
    );
    return;
  }

  const safeFirstName = escapeHtml(params.firstName);
  const safeLastName = escapeHtml(params.lastName);
  const safeEmail = escapeHtml(params.email);
  const safeApplicantId = escapeHtml(params.applicantId);

  const subject = "Research Questionnaire Completed";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a2332 0%, #2d3e50 100%); padding: 32px 20px; text-align: center;">
      <img
        src="${EMAIL_ASSET_BASE_URL}/email-logo.png"
        alt="Reality Matchmaking logo"
        width="60"
        height="60"
        style="display: inline-block; margin-bottom: 16px; border: 0; outline: none; text-decoration: none;"
      />
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Research Questionnaire Completed</h1>
    </div>

    <!-- Content -->
    <div style="padding: 32px;">
      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        A research participant has completed their questionnaire.
      </p>

      <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 24px 0; border-radius: 4px;">
        <h3 style="color: #166534; margin: 0 0 16px; font-size: 16px; font-weight: 600;">Participant Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600; width: 140px;">Name:</td>
            <td style="padding: 8px 0; color: #1a2332;">${safeFirstName} ${safeLastName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Email:</td>
            <td style="padding: 8px 0; color: #1a2332;">${safeEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Applicant ID:</td>
            <td style="padding: 8px 0; color: #1a2332; font-family: monospace; font-size: 14px;">${safeApplicantId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Completed At:</td>
            <td style="padding: 8px 0; color: #1a2332;">${new Date().toLocaleString()}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #718096; font-size: 12px; margin: 0;">
        Reality Matchmaking - Admin Notification
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const questionnaireText =
    "RESEARCH QUESTIONNAIRE COMPLETED\n\n" +
    "A research participant has completed their questionnaire.\n\n" +
    "PARTICIPANT DETAILS\n\n" +
    `Name: ${params.firstName} ${params.lastName}\n` +
    `Email: ${params.email}\n` +
    `Applicant ID: ${params.applicantId}\n` +
    `Completed At: ${new Date().toLocaleString()}`;

  try {
    await sendEmail({
      to: notificationEmail,
      subject,
      html,
      text: questionnaireText,
      emailType: "STATUS_UPDATE",
      applicantId: params.applicantId,
    });
    logger.info("Questionnaire completion notification sent", {
      to: notificationEmail,
    });
  } catch (error) {
    logger.error("Failed to send questionnaire completion notification", {
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - notification failure shouldn't block the user flow
  }
}

export async function notifyApplicationSubmitted(
  params: ApplicationSubmittedParams,
) {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;

  if (!notificationEmail) {
    logger.warn(
      "NOTIFICATION_EMAIL not configured - skipping application submission notification",
    );
    return;
  }

  const safeFirstName = escapeHtml(params.firstName);
  const safeLastName = escapeHtml(params.lastName);
  const safeEmail = escapeHtml(params.email);
  const safeApplicantId = escapeHtml(params.applicantId);
  const safeGender = escapeHtml(formatEnumLabel(params.gender));
  const safeLocation = escapeHtml(params.location);
  const safeIncomeRange = escapeHtml(params.incomeRange);
  const firstPhotoUrl = params.firstPhotoUrl?.trim() || null;
  const safeFirstPhotoUrl = firstPhotoUrl ? escapeHtml(firstPhotoUrl) : null;
  const adminApplicationUrl = `${APP_BASE_URL}/admin/applications/${encodeURIComponent(params.applicantId)}`;
  const safeAdminApplicationUrl = escapeHtml(adminApplicationUrl);

  const subject = "New Application Submitted";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a2332 0%, #2d3e50 100%); padding: 32px 20px; text-align: center;">
      <img
        src="${EMAIL_ASSET_BASE_URL}/email-logo.png"
        alt="Reality Matchmaking logo"
        width="60"
        height="60"
        style="display: inline-block; margin-bottom: 16px; border: 0; outline: none; text-decoration: none;"
      />
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">New Application Submitted</h1>
    </div>

    <!-- Content -->
    <div style="padding: 32px;">
      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        An applicant has submitted their full application and is ready for review.
      </p>

      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 24px 0; border-radius: 4px;">
        <h3 style="color: #1e40af; margin: 0 0 16px; font-size: 16px; font-weight: 600;">Applicant Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600; width: 140px;">Name:</td>
            <td style="padding: 8px 0; color: #1a2332;">${safeFirstName} ${safeLastName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Email:</td>
            <td style="padding: 8px 0; color: #1a2332;">${safeEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Applicant ID:</td>
            <td style="padding: 8px 0; color: #1a2332; font-family: monospace; font-size: 14px;">${safeApplicantId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Age:</td>
            <td style="padding: 8px 0; color: #1a2332;">${params.age}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Gender:</td>
            <td style="padding: 8px 0; color: #1a2332;">${safeGender}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Location:</td>
            <td style="padding: 8px 0; color: #1a2332;">${safeLocation}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Salary Range:</td>
            <td style="padding: 8px 0; color: #1a2332;">${safeIncomeRange}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Submitted At:</td>
            <td style="padding: 8px 0; color: #1a2332;">${new Date().toLocaleString()}</td>
          </tr>
        </table>
      </div>

      ${
        safeFirstPhotoUrl
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
      </div>
      `
          : ""
      }

      <div style="background-color: #fff7ed; border: 1px solid #fed7aa; padding: 16px; border-radius: 4px; margin: 24px 0;">
        <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
          <strong>Action Required:</strong> Please review this application in the admin dashboard.
        </p>
        <p style="margin: 12px 0 0;">
          <a
            href="${safeAdminApplicationUrl}"
            style="display: inline-block; background-color: #1a2332; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 14px; border-radius: 6px;"
          >
            Admin Login / Review Application
          </a>
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #718096; font-size: 12px; margin: 0;">
        Reality Matchmaking - Admin Notification
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const applicationText =
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
    `Admin Login / Review Link: ${adminApplicationUrl}\n\n` +
    "ACTION REQUIRED: Please review this application in the admin dashboard.";

  try {
    await sendEmail({
      to: notificationEmail,
      subject,
      html,
      text: applicationText,
      emailType: "STATUS_UPDATE",
      applicantId: params.applicantId,
    });
    logger.info("Application submission notification sent", {
      to: notificationEmail,
    });
  } catch (error) {
    logger.error("Failed to send application submission notification", {
      error: error instanceof Error ? error.message : String(error),
    });
    // Don't throw - notification failure shouldn't block the user flow
  }
}

export async function notifyAdminCheckrFlagged(params: CheckrFlaggedParams) {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;

  if (!notificationEmail) {
    logger.warn(
      "NOTIFICATION_EMAIL not configured - skipping Checkr flagged result notification",
    );
    return;
  }

  const safeApplicantId = escapeHtml(params.applicantId);
  const safeResult = escapeHtml(params.result);
  const adminApplicationUrl = `${APP_BASE_URL}/admin/applications/${encodeURIComponent(params.applicantId)}`;
  const safeAdminUrl = escapeHtml(adminApplicationUrl);
  const subject = `⚠️ Background Check Requires Review: ${params.result}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Background Check Review Required</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background-color: #d97706; padding: 32px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Background Check Review Required</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        A Checkr background check returned a result that requires admin review before a membership decision can be made.
      </p>
      <div style="background-color: #fff7ed; border-left: 4px solid #d97706; padding: 20px; margin: 24px 0; border-radius: 4px;">
        <h3 style="color: #92400e; margin: 0 0 16px; font-size: 16px; font-weight: 600;">Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600; width: 140px;">Applicant ID:</td>
            <td style="padding: 8px 0; color: #1a2332; font-family: monospace; font-size: 14px;">${safeApplicantId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Checkr Result:</td>
            <td style="padding: 8px 0; color: #92400e; font-weight: 600;">${safeResult}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Time:</td>
            <td style="padding: 8px 0; color: #1a2332;">${new Date().toLocaleString()}</td>
          </tr>
        </table>
      </div>
      <p style="margin: 24px 0 0;">
        <a href="${safeAdminUrl}" style="display: inline-block; background-color: #1a2332; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 14px; border-radius: 6px;">
          Review Application
        </a>
      </p>
    </div>
    <div style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #718096; font-size: 12px; margin: 0;">Reality Matchmaking - Admin Notification</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text =
    "BACKGROUND CHECK REVIEW REQUIRED\n\n" +
    "A Checkr background check returned a result that requires admin review.\n\n" +
    `Applicant ID: ${params.applicantId}\n` +
    `Checkr Result: ${params.result}\n` +
    `Time: ${new Date().toLocaleString()}\n\n` +
    `Review Application: ${adminApplicationUrl}`;

  try {
    await sendEmail({
      to: notificationEmail,
      subject,
      html,
      text,
      emailType: "STATUS_UPDATE",
      applicantId: params.applicantId,
    });
  } catch (error) {
    logger.error("Failed to send Checkr flagged result notification", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function notifyAdminIdenfyReviewing(
  params: IdenfyReviewingParams,
) {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;

  if (!notificationEmail) {
    logger.warn(
      "NOTIFICATION_EMAIL not configured - skipping iDenfy REVIEWING notification",
    );
    return;
  }

  const safeApplicantId = escapeHtml(params.applicantId);
  const safeScanRef = escapeHtml(params.scanRef);
  const adminApplicationUrl = `${APP_BASE_URL}/admin/applications/${encodeURIComponent(params.applicantId)}`;
  const safeAdminUrl = escapeHtml(adminApplicationUrl);
  const subject = `⚠️ Identity Verification Manual Review Required (iDenfy)`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>iDenfy Manual Review Required</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background-color: #d97706; padding: 32px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Identity Verification Manual Review Required</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        An iDenfy identity verification session requires manual review. Follow up in the iDenfy dashboard to complete the verification.
      </p>
      <div style="background-color: #fff7ed; border-left: 4px solid #d97706; padding: 20px; margin: 24px 0; border-radius: 4px;">
        <h3 style="color: #92400e; margin: 0 0 16px; font-size: 16px; font-weight: 600;">Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600; width: 140px;">Applicant ID:</td>
            <td style="padding: 8px 0; color: #1a2332; font-family: monospace; font-size: 14px;">${safeApplicantId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">iDenfy Scan Ref:</td>
            <td style="padding: 8px 0; color: #92400e; font-weight: 600;">${safeScanRef}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Time:</td>
            <td style="padding: 8px 0; color: #1a2332;">${new Date().toLocaleString()}</td>
          </tr>
        </table>
      </div>
      <p style="margin: 24px 0 0;">
        <a href="${safeAdminUrl}" style="display: inline-block; background-color: #1a2332; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 14px; border-radius: 6px;">
          Review Application
        </a>
      </p>
    </div>
    <div style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #718096; font-size: 12px; margin: 0;">Reality Matchmaking - Admin Notification</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text =
    "IDENTITY VERIFICATION MANUAL REVIEW REQUIRED (IDENFY)\n\n" +
    "An iDenfy identity verification session requires manual review. Follow up in the iDenfy dashboard.\n\n" +
    `Applicant ID: ${params.applicantId}\n` +
    `iDenfy Scan Ref: ${params.scanRef}\n` +
    `Time: ${new Date().toLocaleString()}\n\n` +
    `Review Application: ${adminApplicationUrl}`;

  try {
    await sendEmail({
      to: notificationEmail,
      subject,
      html,
      text,
      emailType: "STATUS_UPDATE",
      applicantId: params.applicantId,
    });
  } catch (error) {
    logger.error("Failed to send iDenfy REVIEWING notification", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function notifyAdminMonitoringAlert(
  params: MonitoringAlertParams,
) {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;

  if (!notificationEmail) {
    logger.warn(
      "NOTIFICATION_EMAIL not configured - skipping monitoring alert notification",
    );
    return;
  }

  const safeApplicantId = escapeHtml(params.applicantId);
  const safeCandidateId = escapeHtml(params.candidateId);
  const safeStatus = escapeHtml(params.monitorStatus ?? "unknown");
  const adminApplicationUrl = `${APP_BASE_URL}/admin/applications/${encodeURIComponent(params.applicantId)}`;
  const safeAdminUrl = escapeHtml(adminApplicationUrl);
  const subject = "🚨 Continuous Monitoring Alert — Member Background Change";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Continuous Monitoring Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background-color: #dc2626; padding: 32px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Continuous Monitoring Alert</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Checkr's continuous monitoring has detected a new record for an active member. <strong>Immediate review is required.</strong>
      </p>
      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 24px 0; border-radius: 4px;">
        <h3 style="color: #991b1b; margin: 0 0 16px; font-size: 16px; font-weight: 600;">Alert Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600; width: 140px;">Applicant ID:</td>
            <td style="padding: 8px 0; color: #1a2332; font-family: monospace; font-size: 14px;">${safeApplicantId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Checkr Candidate:</td>
            <td style="padding: 8px 0; color: #1a2332; font-family: monospace; font-size: 14px;">${safeCandidateId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Monitor Status:</td>
            <td style="padding: 8px 0; color: #991b1b; font-weight: 600;">${safeStatus}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Time:</td>
            <td style="padding: 8px 0; color: #1a2332;">${new Date().toLocaleString()}</td>
          </tr>
        </table>
      </div>
      <p style="margin: 24px 0 0;">
        <a href="${safeAdminUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 14px; border-radius: 6px;">
          Review Member Application
        </a>
      </p>
    </div>
    <div style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #718096; font-size: 12px; margin: 0;">Reality Matchmaking - Admin Notification</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text =
    "CONTINUOUS MONITORING ALERT — MEMBER BACKGROUND CHANGE\n\n" +
    "Checkr's continuous monitoring has detected a new record. Immediate review required.\n\n" +
    `Applicant ID: ${params.applicantId}\n` +
    `Checkr Candidate: ${params.candidateId}\n` +
    `Monitor Status: ${params.monitorStatus ?? "unknown"}\n` +
    `Time: ${new Date().toLocaleString()}\n\n` +
    `Review Application: ${adminApplicationUrl}`;

  try {
    await sendEmail({
      to: notificationEmail,
      subject,
      html,
      text,
      emailType: "STATUS_UPDATE",
      applicantId: params.applicantId,
    });
  } catch (error) {
    logger.error("Failed to send monitoring alert notification", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function notifyAdminScreeningPassed(
  params: ScreeningPassedParams,
) {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;

  if (!notificationEmail) {
    logger.warn(
      "NOTIFICATION_EMAIL not configured - skipping screening passed notification",
    );
    return;
  }

  const safeFirstName = escapeHtml(params.firstName);
  const safeLastName = escapeHtml(params.lastName);
  const safeEmail = escapeHtml(params.email);
  const safeApplicantId = escapeHtml(params.applicantId);
  const adminApplicationUrl = `${APP_BASE_URL}/admin/applications/${encodeURIComponent(params.applicantId)}`;
  const safeAdminUrl = escapeHtml(adminApplicationUrl);
  const subject = `${params.firstName} ${params.lastName} has passed all screening and is ready for your review`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Screening Passed</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background-color: #22c55e; padding: 32px 20px; text-align: center;">
      <img
        src="${EMAIL_ASSET_BASE_URL}/email-logo.png"
        alt="Reality Matchmaking logo"
        width="60"
        height="60"
        style="display: inline-block; margin-bottom: 16px; border: 0; outline: none; text-decoration: none;"
      />
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Screening Passed</h1>
    </div>
    <div style="padding: 32px;">
      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        An applicant has passed all screening checks (identity verification and background check) and is ready for your review.
      </p>
      <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 20px; margin: 24px 0; border-radius: 4px;">
        <h3 style="color: #166534; margin: 0 0 16px; font-size: 16px; font-weight: 600;">Applicant Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600; width: 140px;">Name:</td>
            <td style="padding: 8px 0; color: #1a2332;">${safeFirstName} ${safeLastName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Email:</td>
            <td style="padding: 8px 0; color: #1a2332;">${safeEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Applicant ID:</td>
            <td style="padding: 8px 0; color: #1a2332; font-family: monospace; font-size: 14px;">${safeApplicantId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Completed At:</td>
            <td style="padding: 8px 0; color: #1a2332;">${new Date().toLocaleString()}</td>
          </tr>
        </table>
      </div>
      <p style="margin: 24px 0 0;">
        <a href="${safeAdminUrl}" style="display: inline-block; background-color: #1a2332; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 10px 14px; border-radius: 6px;">
          Review Application
        </a>
      </p>
    </div>
    <div style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #718096; font-size: 12px; margin: 0;">Reality Matchmaking - Admin Notification</p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text =
    "SCREENING PASSED\n\n" +
    "An applicant has passed all screening checks and is ready for your review.\n\n" +
    `Name: ${params.firstName} ${params.lastName}\n` +
    `Email: ${params.email}\n` +
    `Applicant ID: ${params.applicantId}\n` +
    `Completed At: ${new Date().toLocaleString()}\n\n` +
    `Review Application: ${adminApplicationUrl}`;

  try {
    await sendEmail({
      to: notificationEmail,
      subject,
      html,
      text,
      emailType: "STATUS_UPDATE",
      applicantId: params.applicantId,
    });
    logger.info("Screening passed notification sent", {
      applicantId: params.applicantId,
    });
  } catch (error) {
    logger.error("Failed to send screening passed notification", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
