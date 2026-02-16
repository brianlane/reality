import { sendEmail } from "./client";
import {
  getWaitlistConfirmationHTML,
  getWaitlistInviteHTML,
} from "./templates";
import { EMAIL_STATUS_CONTENT } from "../status-content";

type WaitlistConfirmationParams = {
  to: string;
  firstName: string;
  applicationId: string;
  applicantId?: string;
};

export async function sendWaitlistConfirmationEmail({
  to,
  applicantId,
}: WaitlistConfirmationParams) {
  const subject = "You're on the Reality Matchmaking Waitlist";
  const html = getWaitlistConfirmationHTML();
  const text =
    "Reality Matchmaking\n\n" +
    "Thank you for your interest in Reality Matchmaking. " +
    "We've received your qualification and you're now on our waitlist.\n\n" +
    "We continually review our waitlist and we will send you an email if there are any changes to your application status.";

  return sendEmail({
    to,
    subject,
    html,
    text,
    emailType: "WAITLIST_CONFIRMATION",
    applicantId,
  });
}

type WaitlistInviteParams = {
  to: string;
  firstName: string;
  inviteToken: string;
  applicantId?: string;
};

export async function sendWaitlistInviteEmail({
  to,
  firstName,
  inviteToken,
  applicantId,
}: WaitlistInviteParams) {
  const subject = EMAIL_STATUS_CONTENT.WAITLIST_INVITED.emailSubject;
  const html = getWaitlistInviteHTML(inviteToken);
  const inviteUrl = `${
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  }/apply/continue?token=${inviteToken}`;
  const text =
    `Hi ${firstName},\n\n` +
    "Great news! We've reviewed your qualification and we're excited to invite you to continue your Reality Matchmaking application.\n\n" +
    "Continue your application: " +
    inviteUrl +
    "\n\n" +
    "Important: This invitation expires in 7 days.";

  return sendEmail({
    to,
    subject,
    html,
    text,
    emailType: "WAITLIST_INVITE",
    applicantId,
  });
}
