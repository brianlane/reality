/**
 * Application Approval Email
 *
 * Sends approval confirmation emails to applicants.
 */

import { sendEmail } from "./client";
import { getApplicationApprovalHTML } from "./templates";
import { EMAIL_STATUS_CONTENT } from "../status-content";

interface ApplicationApprovalParams {
  to: string;
  firstName: string;
  applicantId: string;
}

export async function sendApplicationApprovalEmail(
  params: ApplicationApprovalParams,
) {
  const subject = EMAIL_STATUS_CONTENT.APPROVED.emailSubject;
  const html = getApplicationApprovalHTML();

  const text =
    `Hi ${params.firstName},\n\n` +
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
