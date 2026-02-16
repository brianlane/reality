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

export function getResearchInviteHTML(firstName: string, inviteCode: string) {
  const inviteUrl = `${APP_URL}/research?code=${inviteCode}`;
  const content = EMAIL_STATUS_CONTENT.RESEARCH_INVITED;

  return getSimpleEmailHTML({
    title: content.title,
    description: content.description,
    buttonText: content.actionText,
    buttonUrl: inviteUrl,
  });
}

export function getWaitlistInviteHTML(firstName: string, inviteToken: string) {
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
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: params.currency.toUpperCase(),
  }).format(params.amount / 100);

  return getSimpleEmailHTML({
    title: "Payment Confirmed",
    description: `Thank you for your payment! We've successfully received your application fee of ${formattedAmount} and you're one step closer to finding your match.`,
    buttonText: "View Receipt",
    buttonUrl: params.receiptUrl,
  });
}

export function getApplicationApprovalHTML(firstName: string) {
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

  return getSimpleEmailHTML({
    title: "You're Invited!",
    description: `We're excited to invite you to ${params.eventTitle} on ${formattedDate} from ${formattedStartTime} to ${formattedEndTime} at ${params.eventLocation}, ${params.eventAddress}. This is your opportunity to make meaningful connections in person!`,
    buttonText: "RSVP Now",
    buttonUrl: params.rsvpUrl,
  });
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
  let buttonText = sharedContent?.actionText || "View Dashboard";
  let buttonUrl = `${APP_URL}/dashboard`;

  // Customize for specific statuses
  if (params.status.toUpperCase() === "PAYMENT_PENDING") {
    buttonUrl = `${APP_URL}/apply/payment`;
  } else if (params.status.toUpperCase() === "REJECTED") {
    title = "Application Decision";
    description =
      "Thank you for your interest in Reality Matchmaking. After careful review, we've decided not to move forward with your application at this time.";
  }

  return getSimpleEmailHTML({
    title,
    description,
    buttonText,
    buttonUrl,
  });
}
