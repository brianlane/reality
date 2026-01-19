import { db } from "@/lib/db";

export async function getApplicantByEmail(email: string) {
  const user = await db.user.findUnique({ where: { email } });
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
