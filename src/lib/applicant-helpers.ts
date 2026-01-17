import { db } from "@/lib/db";

export async function getApplicantByClerkId(clerkId: string) {
  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) {
    return null;
  }

  return db.applicant.findUnique({
    where: { userId: user.id },
    include: {
      user: true,
    },
  });
}
