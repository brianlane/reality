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
import {
  getSimpleStatusViewHTML,
  getSimpleEmailHTML,
} from "./simple-status-view";
import { getTimezoneForAddress } from "@/lib/locations";

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

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL_ASSET_BASE_URL = (
  process.env.EMAIL_ASSET_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.realitymatchmaking.com"
).replace(/\/$/, "");

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

export function getResearchInviteHTML(inviteCode: string) {
  const inviteUrl = `${APP_URL}/research?code=${inviteCode}`;
  const content = EMAIL_STATUS_CONTENT.RESEARCH_INVITED;

  return getSimpleEmailHTML({
    title: content.title,
    description: content.description,
    buttonText: content.actionText,
    buttonUrl: inviteUrl,
  });
}

export function getWaitlistInviteHTML(inviteToken: string) {
  const inviteUrl = `${APP_URL}/apply/continue?token=${inviteToken}`;

  return getSimpleStatusViewHTML({
    statusKey: "WAITLIST_INVITED",
    buttonUrl: inviteUrl,
  });
}

export function getPaymentConfirmationHTML(params: {
  firstName: string;
  amount: number;
  currency: string;
  receiptUrl: string;
}) {
  const { amount, currency, receiptUrl } = params;
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);

  return getSimpleEmailHTML({
    title: "Payment Confirmed",
    description: `Thank you for your payment! We've successfully received your application fee of ${formattedAmount} and you're one step closer to finding your match.`,
    buttonText: "View Receipt",
    buttonUrl: receiptUrl,
  });
}

export function getApplicationApprovalHTML() {
  return getSimpleStatusViewHTML({
    statusKey: "APPROVED",
    buttonUrl: `${APP_URL}/dashboard`,
  });
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
  const AZ_TZ = getTimezoneForAddress(params.eventAddress);

  const formattedDate = params.eventDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: AZ_TZ,
  });

  const formattedStartTime = params.startTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: AZ_TZ,
  });

  const formattedEndTime = params.endTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: AZ_TZ,
  });

  const firstName = escapeHtml(params.firstName);
  const eventTitle = escapeHtml(params.eventTitle);
  const eventLocation = escapeHtml(params.eventLocation);
  const eventAddress = escapeHtml(params.eventAddress);
  const rsvpUrl = escapeHtml(params.rsvpUrl);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're in — Reality Matchmaking</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="padding: 48px 40px 32px; text-align: center; border-bottom: 1px solid #e2e8f0;">
      <img
        src="${EMAIL_ASSET_BASE_URL}/email-logo.png"
        alt="Reality Matchmaking"
        width="60"
        height="60"
        style="display: inline-block; margin-bottom: 24px; border: 0; outline: none; text-decoration: none;"
      />
      <p style="color: #c9a880; font-size: 12px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; margin: 0 0 16px;">
        You&rsquo;ve been selected
      </p>
      <h1 style="color: #1a1a2e; font-size: 28px; font-weight: 700; line-height: 1.3; margin: 0;">
        ${firstName}, we&rsquo;re pleased to invite you to the next Reality Matchmaking event.
      </h1>
    </div>

    <!-- Event Details -->
    <div style="padding: 32px 40px; background-color: #fafaf9; border-bottom: 1px solid #e2e8f0;">
      <p style="color: #9d7d52; font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 12px;">Event Details</p>
      <p style="color: #1a1a2e; font-size: 18px; font-weight: 700; margin: 0 0 8px;">${eventTitle}</p>
      <p style="color: #4f4f66; font-size: 15px; margin: 0 0 4px;">${formattedDate}</p>
      <p style="color: #4f4f66; font-size: 15px; margin: 0 0 16px;">${formattedStartTime} &ndash; ${formattedEndTime}</p>
      <p style="color: #1a1a2e; font-size: 15px; font-weight: 600; margin: 0 0 4px;">${eventLocation}</p>
      <p style="color: #4f4f66; font-size: 14px; margin: 0;">${eventAddress}</p>
    </div>

    <!-- Body copy -->
    <div style="padding: 32px 40px;">
      <p style="color: #3a3a52; font-size: 15px; line-height: 1.7; margin: 0 0 20px;">
        This event is limited to 20 members, all of whom have passed our background verification and been manually reviewed. Everyone in the room is there for the same reason you are.
      </p>
      <p style="color: #3a3a52; font-size: 15px; line-height: 1.7; margin: 0 0 20px;">
        The evening begins blind. You&rsquo;ll connect through conversation before seeing anyone. Then we remove the partition, and allow for one more different connection. Then the rest of the night is yours to mingle.
      </p>
      <p style="color: #3a3a52; font-size: 15px; line-height: 1.7; margin: 0 0 20px;">
        <strong style="color: #1a1a2e;">Dress:</strong> Smart casual to cocktail. First impressions matter &mdash; but not yet.
      </p>

      <!-- Urgency -->
      <p style="color: #3a3a52; font-size: 15px; line-height: 1.7; margin: 0 0 20px;">
        Your spot is held for <strong style="color: #1a1a2e;">72 hours</strong>. Confirm your attendance below to secure your place and complete the event fee payment.
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${rsvpUrl}" style="display: inline-block; background-color: #1a1a2e; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 15px; font-weight: 600; letter-spacing: 0.03em;">
          RSVP &amp; Pay &mdash; $749
        </a>
      </div>

      <p style="color: #4f4f66; font-size: 14px; line-height: 1.6; margin: 0; text-align: center;">
        Questions? Reply directly to this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="padding: 24px 40px; background-color: #f8f9fa; border-top: 1px solid #e2e8f0; text-align: center;">
      <p style="color: #4f4f66; font-size: 14px; margin: 0 0 8px;">
        Reality Matchmaking
      </p>
      <p style="color: #9b9bb0; font-size: 12px; margin: 0;">
        Spots that go unclaimed will be offered to the waitlist.
      </p>
    </div>

  </div>
</body>
</html>
  `.trim();
}

export function getMatchNotificationHTML(params: {
  firstName: string;
  partnerFirstName: string;
  eventName: string;
  compatibilityScore: number | null;
  matchesUrl: string;
}) {
  const score =
    params.compatibilityScore !== null
      ? Math.round(params.compatibilityScore)
      : null;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You have a new match!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="padding: 40px 32px; text-align: center;">
      <img
        src="${EMAIL_ASSET_BASE_URL}/email-logo.png"
        alt="Reality Matchmaking logo"
        width="60"
        height="60"
        style="display: inline-block; margin-bottom: 24px; border: 0; outline: none; text-decoration: none;"
      />

      <h1 style="color: #1a2332; margin: 0 0 8px; font-size: 28px; font-weight: 600;">
        You have a new match, ${params.firstName}!
      </h1>

      <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        We found a great connection for you at <strong>${params.eventName}</strong>.
      </p>

      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin: 0 0 32px; text-align: left;">
        <p style="color: #718096; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 8px;">Your Match</p>
        <p style="color: #1a2332; font-size: 22px; font-weight: 600; margin: 0 0 16px;">${params.partnerFirstName}</p>
        ${score !== null ? `<p style="color: #718096; font-size: 14px; margin: 0;">Compatibility: <strong style="color: #1a2332;">${score} / 100</strong></p>` : ""}
      </div>

      <a href="${params.matchesUrl}" style="display: inline-block; background-color: #1a2332; color: white; text-decoration: none; padding: 16px 32px; border-radius: 6px; font-size: 16px; font-weight: 500;">
        View Your Match
      </a>
    </div>

    <div style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #718096; font-size: 12px; margin: 0 0 8px;">
        <a href="https://www.realitymatchmaking.com" style="color: #718096; text-decoration: none;">Reality Matchmaking</a>
      </p>
      <p style="color: #a0aec0; font-size: 11px; margin: 0;">
        You received this email because you are a member of Reality Matchmaking
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
  // Try to get content from shared source first
  const statusKey = params.status.toUpperCase() as StatusContentKey;
  const sharedContent = EMAIL_STATUS_CONTENT[statusKey];

  let title = sharedContent?.title || "Status Update";
  let description =
    sharedContent?.description ||
    params.message ||
    "Your application status has been updated.";
  let buttonText: string | undefined =
    sharedContent?.actionText || "View Dashboard";
  let buttonUrl: string | undefined = `${APP_URL}/dashboard`;

  // Customize for specific statuses
  if (params.status.toUpperCase() === "PAYMENT_PENDING") {
    buttonUrl = `${APP_URL}/apply/payment`;
  } else if (params.status.toUpperCase() === "REJECTED") {
    title = "Application Decision";
    description =
      "Thank you for your interest in Reality Matchmaking. After careful review, we've decided not to move forward with your application at this time.";
    // No button for rejected applicants
    buttonText = undefined;
    buttonUrl = undefined;
  }

  return getSimpleEmailHTML({
    title,
    description,
    buttonText,
    buttonUrl,
  });
}
