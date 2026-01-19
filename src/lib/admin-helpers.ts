import { db } from "@/lib/db";

type AdminIdentity = {
  userId: string;
  email: string;
};

export async function getOrCreateAdminUser({ userId, email }: AdminIdentity) {
  const normalizedEmail = email.toLowerCase();

  const existing = await db.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
  });

  if (existing) {
    if (existing.clerkId !== userId || existing.email !== normalizedEmail) {
      return db.user.update({
        where: { id: existing.id },
        data: {
          clerkId: userId,
          email: normalizedEmail,
        },
      });
    }
    return existing;
  }

  return db.user.create({
    data: {
      clerkId: userId,
      email: normalizedEmail,
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
    },
  });
}
