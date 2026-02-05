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
  const html = getResearchInviteHTML(firstName, inviteCode);

  return sendEmail({
    to,
    subject,
    html,
    emailType: "RESEARCH_INVITE",
    applicantId,
  });
}
