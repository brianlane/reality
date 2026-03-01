/**
 * Match Notification Email
 *
 * Sends match notification emails to participants when admin reveals matches.
 */

import { sendEmail } from "./client";
import { getMatchNotificationHTML } from "./templates";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function sendMatchNotificationEmail(params: {
  to: string;
  firstName: string;
  partnerFirstName: string;
  eventName: string;
  compatibilityScore: number | null;
  applicantId?: string;
}): Promise<void> {
  const matchesUrl = `${APP_URL}/matches`;
  const html = getMatchNotificationHTML({
    firstName: params.firstName,
    partnerFirstName: params.partnerFirstName,
    eventName: params.eventName,
    compatibilityScore: params.compatibilityScore,
    matchesUrl,
  });

  const text =
    `Hi ${params.firstName},\n\n` +
    `Great news! We found a new match for you at ${params.eventName}.\n\n` +
    `Your match is: ${params.partnerFirstName}\n` +
    (params.compatibilityScore !== null
      ? `Compatibility: ${Math.round(params.compatibilityScore)} / 100\n\n`
      : "\n") +
    `View your match at: ${matchesUrl}\n\n` +
    "We hope this connection leads to something meaningful!\n\n" +
    "— The Reality Matchmaking Team";

  await sendEmail({
    to: params.to,
    subject: `You have a new match at ${params.eventName}!`,
    html,
    text,
    emailType: "MATCH_NOTIFICATION",
    applicantId: params.applicantId,
  });
}
