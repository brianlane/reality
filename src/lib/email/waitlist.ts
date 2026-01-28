import { sendEmail } from "./client";
import {
  getWaitlistConfirmationHTML,
  getWaitlistInviteHTML,
} from "./templates";

type WaitlistConfirmationParams = {
  to: string;
  firstName: string;
  applicationId: string;
  applicantId?: string;
};

export async function sendWaitlistConfirmationEmail({
  to,
  firstName,
  applicationId,
  applicantId,
}: WaitlistConfirmationParams) {
  const subject = "You're on the Reality Matchmaking Waitlist";
  const html = getWaitlistConfirmationHTML(firstName, applicationId);

  return sendEmail({
    to,
    subject,
    html,
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
  const subject =
    "You're Invited to Continue Your Reality Matchmaking Application!";
  const html = getWaitlistInviteHTML(firstName, inviteToken);

  return sendEmail({
    to,
    subject,
    html,
    emailType: "WAITLIST_INVITE",
    applicantId,
  });
}
