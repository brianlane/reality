/**
 * Email HTML Templates
 *
 * Single source of truth for all email HTML templates.
 * These functions are used by both:
 * - Email sending (src/lib/email/*.ts)
 * - Email preview endpoint (src/app/api/admin/preview-email/route.ts)
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
        <svg width="60" height="60" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; margin-bottom: 16px;">
          <defs>
            <linearGradient id="lineGradient" x1="12" y1="24" x2="36" y2="24" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#c9a880"/>
              <stop offset="0.5" stop-color="#c9a880" stop-opacity="0.3"/>
              <stop offset="1" stop-color="#c9a880"/>
            </linearGradient>
          </defs>
          <line x1="18" y1="24" x2="30" y2="24" stroke="url(#lineGradient)" stroke-width="2" stroke-linecap="round"/>
          <circle cx="12" cy="24" r="6" fill="#c9a880"/>
          <circle cx="36" cy="24" r="6" fill="#c9a880"/>
        </svg>
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
      <svg width="60" height="60" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: inline-block; margin-bottom: 16px;">
        <defs>
          <linearGradient id="lineGradient" x1="12" y1="24" x2="36" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#c9a880"/>
            <stop offset="0.5" stop-color="#c9a880" stop-opacity="0.3"/>
            <stop offset="1" stop-color="#c9a880"/>
          </linearGradient>
        </defs>
        <line x1="18" y1="24" x2="30" y2="24" stroke="url(#lineGradient)" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="24" r="6" fill="#c9a880"/>
        <circle cx="36" cy="24" r="6" fill="#c9a880"/>
      </svg>
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

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to Continue Your Reality Matchmaking Application!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a2332 0%, #2d3e50 100%); padding: 40px 20px; text-align: center;">
      <div style="width: 60px; height: 60px; margin: 0 auto 16px; background-color: #c8915f; border-radius: 50%; text-align: center; line-height: 60px; font-size: 32px;">
        🎉
      </div>
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">A Spot Has Opened Up!</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px;">
      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Hi ${safeFirstName},
      </p>

      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Great news! We've reviewed your qualification and we're excited to invite you to continue your Reality Matchmaking application.
      </p>

      <div style="background-color: #f8f9fa; border-left: 4px solid #c8915f; padding: 20px; margin: 32px 0; border-radius: 4px;">
        <h3 style="color: #1a2332; margin: 0 0 16px; font-size: 18px; font-weight: 600;">Next Steps:</h3>
        <ol style="color: #4a5568; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li style="margin-bottom: 12px;"><strong>Complete Your Profile:</strong> Fill in your full demographic information</li>
          <li style="margin-bottom: 12px;"><strong>Application Fee:</strong> Submit the $199 application fee</li>
          <li style="margin-bottom: 12px;"><strong>Full Assessment:</strong> Complete our comprehensive 80-question questionnaire</li>
        </ol>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 40px 0;">
        <a href="${inviteUrl}" style="display: inline-block; background-color: #c8915f; color: white; text-decoration: none; padding: 16px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(200, 145, 95, 0.3);">
          Continue Your Application
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
