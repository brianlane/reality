/**
 * Admin Notifications
 *
 * Sends email notifications to administrators for critical events:
 * - Email delivery failures
 * - Research questionnaire completions
 * - Application submissions
 */

import { sendEmail } from "./client";

const EMAIL_ASSET_BASE_URL = (
  process.env.EMAIL_ASSET_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.realitymatchmaking.com"
).replace(/\/$/, "");

// Escape HTML to prevent injection when interpolating user data into email templates
const escapeHtml = (str: string) => {
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return str.replace(/[&<>"']/g, (char) => htmlEscapes[char] ?? char);
};

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

interface ApplicationSubmittedParams {
  applicantId: string;
  firstName: string;
  lastName: string;
  email: string;
}

export async function notifyAdminOfEmailFailure(params: EmailFailureParams) {
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    console.error(
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
    `Email Type: ${safeEmailType}\n` +
    `Recipient: ${safeRecipientEmail}\n` +
    (safeApplicantId ? `Applicant ID: ${safeApplicantId}\n` : "") +
    `Error: ${safeErrorMessage}\n` +
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
    console.log("Admin notification sent successfully");
  } catch (error) {
    console.error("Failed to send admin notification:", error);
    // Don't throw - this is a notification about a failure, we don't want to create a cascade
  }
}

export async function notifyQuestionnaireCompleted(
  params: QuestionnaireCompletedParams,
) {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;

  if (!notificationEmail) {
    console.warn(
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
    `Name: ${safeFirstName} ${safeLastName}\n` +
    `Email: ${safeEmail}\n` +
    `Applicant ID: ${safeApplicantId}\n` +
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
    console.log(
      "Questionnaire completion notification sent to",
      notificationEmail,
    );
  } catch (error) {
    console.error(
      "Failed to send questionnaire completion notification:",
      error,
    );
    // Don't throw - notification failure shouldn't block the user flow
  }
}

export async function notifyApplicationSubmitted(
  params: ApplicationSubmittedParams,
) {
  const notificationEmail = process.env.NOTIFICATION_EMAIL;

  if (!notificationEmail) {
    console.warn(
      "NOTIFICATION_EMAIL not configured - skipping application submission notification",
    );
    return;
  }

  const safeFirstName = escapeHtml(params.firstName);
  const safeLastName = escapeHtml(params.lastName);
  const safeEmail = escapeHtml(params.email);
  const safeApplicantId = escapeHtml(params.applicantId);

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
            <td style="padding: 8px 0; color: #4a5568; font-weight: 600;">Submitted At:</td>
            <td style="padding: 8px 0; color: #1a2332;">${new Date().toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #fff7ed; border: 1px solid #fed7aa; padding: 16px; border-radius: 4px; margin: 24px 0;">
        <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
          <strong>Action Required:</strong> Please review this application in the admin dashboard.
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
    `Name: ${safeFirstName} ${safeLastName}\n` +
    `Email: ${safeEmail}\n` +
    `Applicant ID: ${safeApplicantId}\n` +
    `Submitted At: ${new Date().toLocaleString()}\n\n` +
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
    console.log(
      "Application submission notification sent to",
      notificationEmail,
    );
  } catch (error) {
    console.error("Failed to send application submission notification:", error);
    // Don't throw - notification failure shouldn't block the user flow
  }
}
