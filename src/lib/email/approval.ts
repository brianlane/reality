/**
 * Application Approval Email
 *
 * Sends approval confirmation emails to applicants.
 */

import { sendEmail } from "./client";

const EMAIL_ASSET_BASE_URL = (
  process.env.EMAIL_ASSET_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.realitymatchmaking.com"
).replace(/\/$/, "");

interface ApplicationApprovalParams {
  to: string;
  firstName: string;
  applicantId: string;
}

export async function sendApplicationApprovalEmail(
  params: ApplicationApprovalParams,
) {
  const subject = "Welcome to Reality Matchmaking - Application Approved! 🎉";

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
    <div style="background: linear-gradient(135deg, #1a2332 0%, #2d3e50 100%); padding: 40px 20px; text-align: center;">
      <img
        src="${EMAIL_ASSET_BASE_URL}/email-logo.png"
        alt="Reality Matchmaking logo"
        width="80"
        height="80"
        style="display: inline-block; margin-bottom: 20px; border: 0; outline: none; text-decoration: none;"
      />
      <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 600;">You're Approved!</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px;">
      <p style="color: #1a2332; font-size: 18px; line-height: 1.6; margin: 0 0 24px;">
        Hi ${safeFirstName},
      </p>

      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Congratulations! After careful review of your application, we're thrilled to welcome you as an official member of Reality Matchmaking.
      </p>

      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        Our team was impressed by your profile, and we believe you're an excellent fit for our community of thoughtful, genuine individuals seeking meaningful connections.
      </p>

      <!-- Celebration Section -->
      <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 32px; margin: 32px 0; text-align: center;">
        <h2 style="color: #92400e; margin: 0 0 16px; font-size: 24px; font-weight: 700;">Welcome to the Community</h2>
        <p style="color: #78350f; font-size: 16px; margin: 0; line-height: 1.6;">
          You're now part of an exclusive network of individuals committed to finding authentic, lasting relationships.
        </p>
      </div>

      <div style="background-color: #f8f9fa; border-left: 4px solid #c8915f; padding: 24px; margin: 32px 0; border-radius: 4px;">
        <h3 style="color: #1a2332; margin: 0 0 20px; font-size: 20px; font-weight: 600;">What Happens Next?</h3>
        <ol style="color: #4a5568; margin: 0; padding-left: 20px; line-height: 1.9;">
          <li style="margin-bottom: 16px;">
            <strong style="color: #1a2332;">Event Invitation:</strong> You'll receive an invitation to our next matchmaking event with details about date, time, and venue
          </li>
          <li style="margin-bottom: 16px;">
            <strong style="color: #1a2332;">Curated Matches:</strong> Our team will review your questionnaire and curate personalized matches for you
          </li>
          <li style="margin-bottom: 16px;">
            <strong style="color: #1a2332;">Pre-Event Preparation:</strong> We'll send you tips and guidance to help you make the most of your matchmaking experience
          </li>
          <li style="margin-bottom: 0;">
            <strong style="color: #1a2332;">Ongoing Support:</strong> Our team is here to support you throughout your journey to finding your match
          </li>
        </ol>
      </div>

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

  const text =
    `Hi ${safeFirstName},\n\n` +
    "Congratulations! After careful review of your application, we're thrilled to welcome you as an official member of Reality Matchmaking.\n\n" +
    "Our team was impressed by your profile, and we believe you're an excellent fit for our community of thoughtful, genuine individuals seeking meaningful connections.\n\n" +
    "WELCOME TO THE COMMUNITY\n\n" +
    "You're now part of an exclusive network of individuals committed to finding authentic, lasting relationships.\n\n" +
    "WHAT HAPPENS NEXT?\n\n" +
    "1. Event Invitation: You'll receive an invitation to our next matchmaking event with details about date, time, and venue\n" +
    "2. Curated Matches: Our team will review your questionnaire and curate personalized matches for you\n" +
    "3. Pre-Event Preparation: We'll send you tips and guidance to help you make the most of your matchmaking experience\n" +
    "4. Ongoing Support: Our team is here to support you throughout your journey to finding your match\n\n" +
    "Pro Tip: Start thinking about what you're looking for in a partner. The more clarity you have about your values and goals, the better your matches will be!\n\n" +
    "We're excited to begin this journey with you. If you have any questions or need support, don't hesitate to reach out.\n\n" +
    "Welcome aboard,\n" +
    "The Reality Matchmaking Team";

  return sendEmail({
    to: params.to,
    subject,
    html,
    text,
    emailType: "APPLICATION_APPROVAL",
    applicantId: params.applicantId,
  });
}
