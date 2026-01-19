import { db } from "@/lib/db";

export async function getApplicantByEmail(email: string) {
  const normalizedEmail = email.toLowerCase();
  const user = await db.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
  });
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
