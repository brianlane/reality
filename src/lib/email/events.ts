/**
 * Event Invitation Email
 *
 * Sends event invitation emails with RSVP functionality.
 */

import { sendEmail } from "./client";

const EMAIL_ASSET_BASE_URL = (
  process.env.EMAIL_ASSET_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.realitymatchmaking.com"
).replace(/\/$/, "");

interface EventInvitationParams {
  to: string;
  firstName: string;
  eventTitle: string;
  eventDate: Date;
  eventLocation: string;
  eventAddress: string;
  startTime: Date;
  endTime: Date;
  rsvpUrl: string;
  applicantId?: string;
}

export async function sendEventInvitationEmail(params: EventInvitationParams) {
  const subject = `You're Invited: ${params.eventTitle}`;

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
  const safeEventTitle = escapeHtml(params.eventTitle);
  const safeLocation = escapeHtml(params.eventLocation);
  const safeAddress = escapeHtml(params.eventAddress);

  // Format dates and times
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

  const text =
    `Hi ${safeFirstName},\n\n` +
    "We're excited to invite you to an exclusive Reality Matchmaking event where you'll meet other carefully selected members of our community. " +
    "This is your opportunity to make meaningful connections in person!\n\n" +
    `EVENT: ${safeEventTitle}\n\n` +
    "EVENT DETAILS\n\n" +
    `Date: ${formattedDate}\n` +
    `Time: ${formattedStartTime} - ${formattedEndTime}\n` +
    `Location: ${safeLocation}\n` +
    `Address: ${safeAddress}\n\n` +
    `RSVP Now: ${params.rsvpUrl}\n\n` +
    `Please RSVP by ${new Date(params.eventDate.getTime() - 3 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric" })}\n\n` +
    "Space is limited, so we need your response to finalize arrangements and ensure everyone has the best experience possible.\n\n" +
    "WHAT TO EXPECT\n\n" +
    "- Meet 10-15 carefully matched members in a relaxed, upscale setting\n" +
    "- Participate in structured introductions and conversation activities\n" +
    "- Enjoy complimentary refreshments and a welcoming atmosphere\n" +
    "- Connect with our team for personalized support and guidance\n\n" +
    "We can't wait to see you there and help you make meaningful connections!\n\n" +
    "Questions about the event? Reply to this email and we'll get back to you right away.";

  return sendEmail({
    to: params.to,
    subject,
    html,
    text,
    emailType: "EVENT_INVITATION",
    applicantId: params.applicantId,
  });
}
