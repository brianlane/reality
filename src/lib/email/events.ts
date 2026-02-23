/**
 * Event Invitation Email
 *
 * Sends event invitation emails with RSVP functionality.
 */

import { sendEmail } from "./client";
import { getEventInvitationHTML } from "./templates";

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
  const html = getEventInvitationHTML(params);

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

  const text =
    `Hi ${params.firstName},\n\n` +
    "We're excited to invite you to an exclusive Reality Matchmaking event where you'll meet other carefully selected members of our community. " +
    "This is your opportunity to make meaningful connections in person!\n\n" +
    `EVENT: ${params.eventTitle}\n\n` +
    "EVENT DETAILS\n\n" +
    `Date: ${formattedDate}\n` +
    `Time: ${formattedStartTime} - ${formattedEndTime}\n` +
    `Location: ${params.eventLocation}\n` +
    `Address: ${params.eventAddress}\n\n` +
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
