import { sendEmail } from "./client";
import { getResearchInviteHTML } from "./templates";

type ResearchInviteParams = {
  to: string;
  firstName: string;
  inviteCode: string;
  applicantId?: string;
};

export async function sendResearchInviteEmail({
  to,
  firstName,
  inviteCode,
  applicantId,
}: ResearchInviteParams) {
  const subject =
    "You're Invited to Participate in Reality Matchmaking Research";
  const html = getResearchInviteHTML(inviteCode);
  const inviteUrl = `${
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  }/research?code=${inviteCode}`;
  const text =
    `Hi ${firstName},\n\n` +
    "You've been invited to participate in a research questionnaire for Reality Matchmaking. " +
    "Your responses help us validate and improve our compatibility questions.\n\n" +
    "Start questionnaire: " +
    inviteUrl;

  return sendEmail({
    to,
    subject,
    html,
    text,
    emailType: "RESEARCH_INVITE",
    applicantId,
  });
}
