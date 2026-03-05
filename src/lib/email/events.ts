/**
 * Event Invitation Email
 *
 * Sends event invitation emails with RSVP functionality.
 */

import { sendEmail } from "./client";
import { getEventInvitationHTML } from "./templates";
import { getTimezoneForAddress } from "@/lib/locations";

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
  const AZ_TZ = getTimezoneForAddress(params.eventAddress);

  const monthYear = params.eventDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: AZ_TZ,
  });

  const subject = `You're in — here's everything you need for ${monthYear}`;
  const html = getEventInvitationHTML(params);

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

  const text =
    `Hi ${params.firstName},\n\n` +
    `You've been selected.\n\n` +
    `After reviewing your application, we are pleased to invite you to the next Reality Matchmaking event.\n\n` +
    `EVENT DETAILS\n\n` +
    `${params.eventTitle}\n` +
    `${formattedDate}\n` +
    `${formattedStartTime} – ${formattedEndTime}\n` +
    `${params.eventLocation}\n` +
    `${params.eventAddress}\n\n` +
    `This event is limited to 20 members, all of whom have passed our background verification and been manually reviewed. Everyone in the room is there for the same reason you are.\n\n` +
    `The evening begins blind. You'll connect through conversation before seeing anyone. Then we remove the partition, and allow for one more different connection. Then the rest of the night is yours to mingle.\n\n` +
    `Dress: Smart casual to cocktail. First impressions matter — but not yet.\n\n` +
    `Your spot is held for 72 hours. Confirm your attendance below to secure your place and complete the event fee payment.\n\n` +
    `RSVP & Pay — $749\n${params.rsvpUrl}\n\n` +
    `Questions? Reply directly to this email.\n\n` +
    `— Reality Matchmaking\n\n` +
    `Spots that go unclaimed will be offered to the waitlist.`;

  return sendEmail({
    to: params.to,
    subject,
    html,
    text,
    emailType: "EVENT_INVITATION",
    applicantId: params.applicantId,
  });
}
