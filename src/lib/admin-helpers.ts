import { db } from "@/lib/db";

export async function getOrCreateAdminUser(clerkId: string) {
  return (
    (await db.user.findUnique({ where: { clerkId } })) ??
    db.user.create({
      data: {
        clerkId,
        email: `${clerkId}@mock.local`,
        firstName: "Admin",
        lastName: "User",
        role: "ADMIN",
      },
    })
  );
}
