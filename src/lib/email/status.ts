/**
 * Application Status Update Email
 *
 * Sends status update emails with customized content based on application status.
 */

import { sendEmail } from "./client";

interface ApplicationStatusParams {
  to: string;
  firstName: string;
  status: string;
  message?: string;
  applicantId?: string;
}

export async function sendApplicationStatusEmail(
  params: ApplicationStatusParams,
) {
  // Escape HTML
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

  const safeFirstName = escapeHtml(params.firstName);
  const safeMessage = params.message ? escapeHtml(params.message) : "";

  // Customize content based on status
  let subject = "Application Status Update - Reality Matchmaking";
  let headerText = "Status Update";
  let headerColor = "#1a2332";
  let headerIcon = "ℹ️";
  let mainMessage = "";
  let additionalInfo = "";

  switch (params.status.toUpperCase()) {
    case "SCREENING_IN_PROGRESS":
      subject = "Your Background Check is In Progress";
      headerText = "Screening in Progress";
      headerColor = "#2563eb";
      headerIcon = "🔍";
      mainMessage = `We're currently processing your background check and identity verification. This typically takes 2-3 business days.`;
      additionalInfo = `
        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="color: #1e40af; font-size: 14px; margin: 0; line-height: 1.6;">
            <strong>What's being checked:</strong>
          </p>
          <ul style="color: #1e40af; font-size: 14px; margin: 12px 0 0; padding-left: 20px;">
            <li>Identity verification</li>
            <li>Criminal background check</li>
            <li>Sex offender registry</li>
          </ul>
        </div>
      `;
      break;

    case "REJECTED":
      subject = "Update on Your Application";
      headerText = "Application Decision";
      headerColor = "#dc2626";
      headerIcon = "✉️";
      mainMessage = `Thank you for your interest in Reality Matchmaking. After careful review, we've decided not to move forward with your application at this time.`;
      additionalInfo = `
        <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 24px 0;">
          This decision is based on our matching criteria and current member composition. We maintain high standards to ensure the best experience for all members.
        </p>
        ${
          safeMessage
            ? `
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 24px 0; border-radius: 4px;">
          <p style="color: #991b1b; font-size: 14px; margin: 0; line-height: 1.6;">
            ${safeMessage}
          </p>
        </div>
        `
            : ""
        }
        <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 24px 0;">
          We wish you the best in your search for a meaningful relationship.
        </p>
      `;
      break;

    case "PAYMENT_PENDING":
      subject = "Complete Your Payment to Continue";
      headerText = "Payment Required";
      headerColor = "#c8915f";
      headerIcon = "💳";
      mainMessage = `To continue with your application, please complete the $199 application fee payment.`;
      additionalInfo = `
        <div style="background-color: #fff7ed; border: 1px solid #fed7aa; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
            <strong>What happens after payment:</strong>
          </p>
          <ol style="color: #92400e; font-size: 14px; margin: 12px 0 0; padding-left: 20px; line-height: 1.7;">
            <li>Complete full application questionnaire (80 questions)</li>
            <li>Identity verification and background check</li>
            <li>Review by our team</li>
            <li>Approval and event invitation</li>
          </ol>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/apply/payment" style="display: inline-block; background-color: #c8915f; color: white; text-decoration: none; padding: 16px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(200, 145, 95, 0.3);">
            Complete Payment
          </a>
        </div>
      `;
      break;

    case "SUBMITTED":
      subject = "Application Received - Under Review";
      headerText = "Under Review";
      headerColor = "#059669";
      headerIcon = "✓";
      mainMessage = `We've received your complete application and our team is currently reviewing it. We'll be in touch within 3-5 business days.`;
      additionalInfo = `
        <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="color: #065f46; font-size: 14px; margin: 0; line-height: 1.6;">
            <strong>Our review process includes:</strong>
          </p>
          <ul style="color: #065f46; font-size: 14px; margin: 12px 0 0; padding-left: 20px;">
            <li>Compatibility assessment</li>
            <li>Profile completeness check</li>
            <li>Background check verification</li>
            <li>Fit with current member community</li>
          </ul>
        </div>
      `;
      break;

    default:
      mainMessage = safeMessage || "Your application status has been updated.";
      additionalInfo = "";
  }

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
    <div style="background: linear-gradient(135deg, ${headerColor} 0%, ${headerColor}dd 100%); padding: 40px 20px; text-align: center;">
      <div style="width: 60px; height: 60px; margin: 0 auto 16px; background-color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 32px;">${headerIcon}</span>
      </div>
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">${headerText}</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px;">
      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Hi ${safeFirstName},
      </p>

      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        ${mainMessage}
      </p>

      ${additionalInfo}

      <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 32px 0 0; text-align: center;">
        Questions? Reply to this email and our team will be happy to help.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #718096; font-size: 12px; margin: 0 0 8px;">
        Reality Matchmaking
      </p>
      <p style="color: #a0aec0; font-size: 11px; margin: 0;">
        You received this email regarding your Reality Matchmaking application
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({
    to: params.to,
    subject,
    html,
    emailType: "STATUS_UPDATE",
    applicantId: params.applicantId,
  });
}
