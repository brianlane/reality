/**
 * Email HTML Templates
 *
 * Single source of truth for all email HTML templates.
 * These functions are used by both:
 * - Email sending (src/lib/email/*.ts)
 * - Email preview endpoint (src/app/api/admin/preview-email/route.ts)
 *
 * Content definitions come from src/lib/status-content.ts to ensure
 * consistency between emails and webpages.
 */

import { EMAIL_STATUS_CONTENT, type StatusContentKey } from "../status-content";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL_ASSET_BASE_URL = (
  process.env.EMAIL_ASSET_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.realitymatchmaking.com"
).replace(/\/$/, "");

const htmlEscapes: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => htmlEscapes[char] ?? char);
}

export function getWaitlistConfirmationHTML() {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're on the Reality Matchmaking Waitlist</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Content -->
    <div style="padding: 40px 32px;">
      <!-- Logo and Title -->
      <div style="text-align: center; margin-bottom: 32px;">
        <img
          src="${EMAIL_ASSET_BASE_URL}/email-logo.png"
          alt="Reality Matchmaking logo"
          width="60"
          height="60"
          style="display: inline-block; margin-bottom: 16px; border: 0; outline: none; text-decoration: none;"
        />
        <h1 style="color: #1a1a2e; margin: 0; font-size: 32px; font-weight: 600;">Reality Matchmaking</h1>
      </div>

      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
        Thank you for your interest in Reality Matchmaking. We've received your qualification and you're now on our waitlist.
      </p>

      <p style="color: #4a5568; font-size: 16px; line-height: 1.8; margin: 32px 0 0; text-align: center;">
        We continually review our waitlist and we will send you an email if there are any changes to your application status.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #718096; font-size: 12px; margin: 0 0 8px;">
        <a href="https://www.realitymatchmaking.com" style="color: #718096; text-decoration: none;">Reality Matchmaking</a>
      </p>
      <p style="color: #a0aec0; font-size: 11px; margin: 0;">
        You received this email because you applied to Reality Matchmaking
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function getResearchInviteHTML(firstName: string, inviteCode: string) {
  const inviteUrl = `${APP_URL}/research?code=${inviteCode}`;
  const safeFirstName = escapeHtml(firstName);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to Participate in Reality Matchmaking Research</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a2332 0%, #2d3e50 100%); padding: 40px 20px; text-align: center;">
      <img
        src="${EMAIL_ASSET_BASE_URL}/email-logo.png"
        alt="Reality Matchmaking logo"
        width="60"
        height="60"
        style="display: inline-block; margin-bottom: 16px; border: 0; outline: none; text-decoration: none;"
      />
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Research Invitation</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px;">
      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Hi ${safeFirstName},
      </p>

      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        You've been invited to participate in a research questionnaire for Reality Matchmaking. Your responses will help us validate and improve our compatibility questions.
      </p>

      <div style="background-color: #f8f9fa; border-left: 4px solid #c8915f; padding: 20px; margin: 32px 0; border-radius: 4px;">
        <h3 style="color: #1a2332; margin: 0 0 12px; font-size: 18px; font-weight: 600;">What to expect:</h3>
        <ul style="color: #4a5568; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li style="margin-bottom: 8px;">A questionnaire about compatibility preferences</li>
          <li style="margin-bottom: 8px;">Your answers are used for research purposes only</li>
          <li style="margin-bottom: 8px;">You can complete it at your own pace</li>
        </ul>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 40px 0;">
        <a href="${inviteUrl}" style="display: inline-block; background-color: #c8915f; color: white; text-decoration: none; padding: 16px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(200, 145, 95, 0.3);">
          Start Questionnaire
        </a>
      </div>

      <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 32px 0 0; text-align: center;">
        Can't click the button? Copy and paste this link into your browser:<br>
        <a href="${inviteUrl}" style="color: #c8915f; word-break: break-all;">${inviteUrl}</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #718096; font-size: 12px; margin: 0 0 8px;">
        <a href="https://www.realitymatchmaking.com" style="color: #718096; text-decoration: none;">Reality Matchmaking</a>
      </p>
      <p style="color: #a0aec0; font-size: 11px; margin: 0;">
        You received this email because you were invited to participate in research for Reality Matchmaking
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function getWaitlistInviteHTML(firstName: string, inviteToken: string) {
  const inviteUrl = `${APP_URL}/apply/continue?token=${inviteToken}`;
  const safeFirstName = escapeHtml(firstName);
  const content = EMAIL_STATUS_CONTENT.WAITLIST_INVITED;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.emailSubject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a2332 0%, #2d3e50 100%); padding: 40px 20px; text-align: center;">
      <div style="width: 60px; height: 60px; margin: 0 auto 16px; background-color: #c8915f; border-radius: 50%; text-align: center; line-height: 60px; font-size: 32px;">
        🎉
      </div>
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">${content.title}</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px;">
      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        ${content.greeting(safeFirstName)}
      </p>

      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        ${content.description}
      </p>

      ${
        content.nextSteps
          ? `
      <div style="background-color: #f8f9fa; border-left: 4px solid #c8915f; padding: 20px; margin: 32px 0; border-radius: 4px;">
        <h3 style="color: #1a2332; margin: 0 0 16px; font-size: 18px; font-weight: 600;">${content.nextSteps.title}</h3>
        <ol style="color: #4a5568; margin: 0; padding-left: 20px; line-height: 1.8;">
          ${content.nextSteps.steps.map((step) => `<li style="margin-bottom: 12px;">${step}</li>`).join("")}
        </ol>
      </div>
      `
          : ""
      }

      <!-- CTA Button -->
      <div style="text-align: center; margin: 40px 0;">
        <a href="${inviteUrl}" style="display: inline-block; background-color: #c8915f; color: white; text-decoration: none; padding: 16px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(200, 145, 95, 0.3);">
          ${content.actionText}
        </a>
      </div>

      <div style="background-color: #fff5e6; border: 1px solid #f0e0c0; padding: 16px; border-radius: 4px; margin: 32px 0;">
        <p style="color: #8b6914; font-size: 14px; margin: 0; text-align: center;">
          ⏰ <strong>Important:</strong> This invitation expires in 7 days
        </p>
      </div>

      <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 32px 0 0; text-align: center;">
        Can't click the button? Copy and paste this link into your browser:<br>
        <a href="${inviteUrl}" style="color: #c8915f; word-break: break-all;">${inviteUrl}</a>
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #718096; font-size: 12px; margin: 0 0 8px;">
        Reality Matchmaking
      </p>
      <p style="color: #a0aec0; font-size: 11px; margin: 0;">
        You received this email because you're on the Reality Matchmaking waitlist
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function getPaymentConfirmationHTML(params: {
  firstName: string;
  amount: number;
  currency: string;
  receiptUrl: string;
}) {
  const safeFirstName = escapeHtml(params.firstName);
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: params.currency.toUpperCase(),
  }).format(params.amount / 100);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Received - Reality Matchmaking</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a2332 0%, #2d3e50 100%); padding: 40px 20px; text-align: center;">
      <img
        src="${EMAIL_ASSET_BASE_URL}/email-logo.png"
        alt="Reality Matchmaking logo"
        width="60"
        height="60"
        style="display: inline-block; margin-bottom: 16px; border: 0; outline: none; text-decoration: none;"
      />
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Payment Confirmed</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px;">
      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Hi ${safeFirstName},
      </p>

      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Thank you for your payment! We've successfully received your application fee and you're one step closer to finding your match.
      </p>

      <!-- Payment Details -->
      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin: 32px 0;">
        <h3 style="color: #1a2332; margin: 0 0 20px; font-size: 18px; font-weight: 600;">Payment Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; color: #4a5568; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Amount Paid:</td>
            <td style="padding: 12px 0; color: #1a2332; font-weight: 700; font-size: 18px; text-align: right; border-bottom: 1px solid #e2e8f0;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #4a5568; font-weight: 600;">Date:</td>
            <td style="padding: 12px 0; color: #1a2332; text-align: right;">${new Date().toLocaleDateString(
              "en-US",
              {
                year: "numeric",
                month: "long",
                day: "numeric",
              },
            )}</td>
          </tr>
        </table>
      </div>

      <!-- Receipt Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${params.receiptUrl}" style="display: inline-block; background-color: #c8915f; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 15px; font-weight: 600; box-shadow: 0 2px 4px rgba(200, 145, 95, 0.3);">
          View Receipt
        </a>
      </div>

      <div style="background-color: #f8f9fa; border-left: 4px solid #c8915f; padding: 20px; margin: 32px 0; border-radius: 4px;">
        <h3 style="color: #1a2332; margin: 0 0 16px; font-size: 18px; font-weight: 600;">What's Next?</h3>
        <ol style="color: #4a5568; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li style="margin-bottom: 12px;"><strong>Complete Your Profile:</strong> Fill in your detailed questionnaire</li>
          <li style="margin-bottom: 12px;"><strong>Background Check:</strong> Complete your identity verification and background check</li>
          <li style="margin-bottom: 12px;"><strong>Review Process:</strong> Our team will review your complete application</li>
          <li style="margin-bottom: 12px;"><strong>Approval:</strong> Once approved, you'll be invited to our next matchmaking event</li>
        </ol>
      </div>

      <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 32px 0 0; text-align: center;">
        Questions about your payment? Reply to this email and we'll be happy to help.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #718096; font-size: 12px; margin: 0 0 8px;">
        Reality Matchmaking
      </p>
      <p style="color: #a0aec0; font-size: 11px; margin: 0;">
        You received this email because you made a payment to Reality Matchmaking
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function getApplicationApprovalHTML(firstName: string) {
  const safeFirstName = escapeHtml(firstName);
  const content = EMAIL_STATUS_CONTENT.APPROVED;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.emailSubject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a2332 0%, #2d3e50 100%); padding: 40px 20px; text-align: center;">
      <img
        src="${EMAIL_ASSET_BASE_URL}/email-logo.png"
        alt="Reality Matchmaking logo"
        width="80"
        height="80"
        style="display: inline-block; margin-bottom: 20px; border: 0; outline: none; text-decoration: none;"
      />
      <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 600;">${content.title}</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px;">
      <p style="color: #1a2332; font-size: 18px; line-height: 1.6; margin: 0 0 24px;">
        ${content.greeting(safeFirstName)}
      </p>

      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        ${content.description}
      </p>

      <!-- Celebration Section -->
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 32px; margin: 32px 0; text-align: center;">
        <h2 style="color: #92400e; margin: 0 0 16px; font-size: 24px; font-weight: 700;">Welcome to the Community</h2>
        <p style="color: #78350f; font-size: 16px; margin: 0; line-height: 1.6;">
          You're now part of an exclusive network of individuals committed to finding authentic, lasting relationships.
        </p>
      </div>

      ${
        content.nextSteps
          ? `
      <div style="background-color: #f8f9fa; border-left: 4px solid #c8915f; padding: 24px; margin: 32px 0; border-radius: 4px;">
        <h3 style="color: #1a2332; margin: 0 0 20px; font-size: 20px; font-weight: 600;">${content.nextSteps.title}</h3>
        <ol style="color: #4a5568; margin: 0; padding-left: 20px; line-height: 1.9;">
          ${content.nextSteps.steps.map((step) => `<li style="margin-bottom: 16px;">${step}</li>`).join("")}
        </ol>
      </div>
      `
          : ""
      }

      <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 20px; border-radius: 8px; margin: 32px 0;">
        <p style="color: #065f46; font-size: 15px; margin: 0; line-height: 1.6;">
          <strong>💡 Pro Tip:</strong> Start thinking about what you're looking for in a partner. The more clarity you have about your values and goals, the better your matches will be!
        </p>
      </div>

      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 32px 0 0;">
        We're excited to begin this journey with you. If you have any questions or need support, don't hesitate to reach out.
      </p>

      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 24px 0 0;">
        Welcome aboard,<br>
        <strong style="color: #c8915f;">The Reality Matchmaking Team</strong>
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #718096; font-size: 12px; margin: 0 0 8px;">
        Reality Matchmaking
      </p>
      <p style="color: #a0aec0; font-size: 11px; margin: 0;">
        You received this email because your Reality Matchmaking application was approved
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function getEventInvitationHTML(params: {
  firstName: string;
  eventTitle: string;
  eventDate: Date;
  eventLocation: string;
  eventAddress: string;
  startTime: Date;
  endTime: Date;
  rsvpUrl: string;
}) {
  const safeFirstName = escapeHtml(params.firstName);
  const safeEventTitle = escapeHtml(params.eventTitle);
  const safeLocation = escapeHtml(params.eventLocation);
  const safeAddress = escapeHtml(params.eventAddress);

  const formattedDate = params.eventDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedStartTime = params.startTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const formattedEndTime = params.endTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited: ${safeEventTitle}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #c8915f 0%, #a67c52 100%); padding: 40px 20px; text-align: center;">
      <img
        src="${EMAIL_ASSET_BASE_URL}/email-logo.png"
        alt="Reality Matchmaking logo"
        width="80"
        height="80"
        style="display: inline-block; margin-bottom: 20px; border: 0; outline: none; text-decoration: none;"
      />
      <h1 style="color: white; margin: 0 0 12px; font-size: 32px; font-weight: 600;">You're Invited!</h1>
      <p style="color: #fef3c7; font-size: 16px; margin: 0;">${safeEventTitle}</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px;">
      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Hi ${safeFirstName},
      </p>

      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        We're excited to invite you to an exclusive Reality Matchmaking event where you'll meet other carefully selected members of our community. This is your opportunity to make meaningful connections in person!
      </p>

      <!-- Event Details Card -->
      <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e5e7eb 100%); border-radius: 12px; padding: 32px; margin: 32px 0; border: 2px solid #c8915f;">
        <h2 style="color: #1a2332; margin: 0 0 24px; font-size: 24px; font-weight: 700; text-align: center;">Event Details</h2>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 16px 0; vertical-align: top;">
              <div style="display: inline-block; width: 40px; height: 40px; background-color: #c8915f; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 16px;">
                <span style="font-size: 24px;">📅</span>
              </div>
            </td>
            <td style="padding: 16px 0;">
              <div style="color: #4a5568; font-size: 13px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Date</div>
              <div style="color: #1a2332; font-size: 16px; font-weight: 600;">${formattedDate}</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 0; vertical-align: top;">
              <div style="display: inline-block; width: 40px; height: 40px; background-color: #c8915f; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 16px;">
                <span style="font-size: 24px;">⏰</span>
              </div>
            </td>
            <td style="padding: 16px 0;">
              <div style="color: #4a5568; font-size: 13px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Time</div>
              <div style="color: #1a2332; font-size: 16px; font-weight: 600;">${formattedStartTime} - ${formattedEndTime}</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 0; vertical-align: top;">
              <div style="display: inline-block; width: 40px; height: 40px; background-color: #c8915f; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 16px;">
                <span style="font-size: 24px;">📍</span>
              </div>
            </td>
            <td style="padding: 16px 0;">
              <div style="color: #4a5568; font-size: 13px; font-weight: 600; text-transform: uppercase; margin-bottom: 4px;">Location</div>
              <div style="color: #1a2332; font-size: 16px; font-weight: 600; margin-bottom: 4px;">${safeLocation}</div>
              <div style="color: #4a5568; font-size: 14px;">${safeAddress}</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- RSVP Button -->
      <div style="text-align: center; margin: 40px 0;">
        <a href="${params.rsvpUrl}" style="display: inline-block; background-color: #c8915f; color: white; text-decoration: none; padding: 18px 48px; border-radius: 8px; font-size: 18px; font-weight: 700; box-shadow: 0 4px 6px rgba(200, 145, 95, 0.4); text-transform: uppercase; letter-spacing: 0.5px;">
          RSVP Now
        </a>
      </div>

      <div style="background-color: #fff7ed; border: 1px solid #fed7aa; padding: 20px; border-radius: 8px; margin: 32px 0;">
        <p style="color: #92400e; font-size: 14px; margin: 0 0 12px; font-weight: 600;">
          ⏰ Please RSVP by ${new Date(params.eventDate.getTime() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
        </p>
        <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
          Space is limited, so we need your response to finalize arrangements and ensure everyone has the best experience possible.
        </p>
      </div>

      <div style="background-color: #f8f9fa; border-left: 4px solid #c8915f; padding: 24px; margin: 32px 0; border-radius: 4px;">
        <h3 style="color: #1a2332; margin: 0 0 16px; font-size: 18px; font-weight: 600;">What to Expect</h3>
        <ul style="color: #4a5568; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li style="margin-bottom: 12px;">Meet 10-15 carefully matched members in a relaxed, upscale setting</li>
          <li style="margin-bottom: 12px;">Participate in structured introductions and conversation activities</li>
          <li style="margin-bottom: 12px;">Enjoy complimentary refreshments and a welcoming atmosphere</li>
          <li style="margin-bottom: 12px;">Connect with our team for personalized support and guidance</li>
        </ul>
      </div>

      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 32px 0 0;">
        We can't wait to see you there and help you make meaningful connections!
      </p>

      <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 24px 0 0; text-align: center;">
        Questions about the event? Reply to this email and we'll get back to you right away.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #718096; font-size: 12px; margin: 0 0 8px;">
        Reality Matchmaking
      </p>
      <p style="color: #a0aec0; font-size: 11px; margin: 0;">
        You received this invitation because you're an approved member of Reality Matchmaking
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function getStatusUpdateHTML(params: {
  firstName: string;
  status: string;
  message?: string;
}) {
  const safeFirstName = escapeHtml(params.firstName);
  const safeMessage = params.message ? escapeHtml(params.message) : "";

  // Try to get content from shared source first
  const statusKey = params.status.toUpperCase() as StatusContentKey;
  const sharedContent = EMAIL_STATUS_CONTENT[statusKey];

  let headerText = sharedContent?.title || "Status Update";
  let headerColor = "#1a2332";
  let mainMessage = sharedContent?.description || safeMessage || "Your application status has been updated.";
  let additionalInfo = "";

  switch (params.status.toUpperCase()) {
    case "SCREENING_IN_PROGRESS":
      headerColor = "#2563eb";
      break;

    case "REJECTED":
      headerText = "Application Decision";
      headerColor = "#dc2626";
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
      headerColor = "#c8915f";
      if (sharedContent?.nextSteps) {
        additionalInfo = `
        <div style="background-color: #fff7ed; border: 1px solid #fed7aa; padding: 20px; border-radius: 8px; margin: 24px 0;">
          <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.6;">
            <strong>${sharedContent.nextSteps.title}</strong>
          </p>
          <ol style="color: #92400e; font-size: 14px; margin: 12px 0 0; padding-left: 20px; line-height: 1.7;">
            ${sharedContent.nextSteps.steps.map((step) => `<li>${step}</li>`).join("")}
          </ol>
        </div>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${APP_URL}/apply/payment" style="display: inline-block; background-color: #c8915f; color: white; text-decoration: none; padding: 16px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(200, 145, 95, 0.3);">
            ${sharedContent.actionText}
          </a>
        </div>
      `;
      }
      break;

    case "SUBMITTED":
      headerColor = "#059669";
      break;

    default:
      // Use shared content if available
      break;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Status Update - Reality Matchmaking</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, ${headerColor} 0%, ${headerColor}dd 100%); padding: 40px 20px; text-align: center;">
      <img
        src="${EMAIL_ASSET_BASE_URL}/email-logo.png"
        alt="Reality Matchmaking logo"
        width="60"
        height="60"
        style="display: inline-block; margin-bottom: 16px; border: 0; outline: none; text-decoration: none;"
      />
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">${headerText}</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px;">
      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        ${sharedContent ? sharedContent.greeting(safeFirstName) : `Hi ${safeFirstName},`}
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
}
