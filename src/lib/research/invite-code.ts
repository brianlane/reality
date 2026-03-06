import { randomBytes } from "crypto";
type InviteLookupClient = {
  applicant: {
    findFirst: (args: {
      where: { researchInviteCode: string };
      select: { id: true };
    }) => Promise<{ id: string } | null>;
  };
};

function createInviteCode() {
  return randomBytes(16).toString("hex");
}

export async function generateUniqueResearchInviteCode(
  prisma: InviteLookupClient,
): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = createInviteCode();
    const existing = await prisma.applicant.findFirst({
      where: { researchInviteCode: inviteCode },
      select: { id: true },
    });
    if (!existing) {
      return inviteCode;
    }
  }

  throw new Error("Failed to generate unique invite code after 5 attempts.");
}
