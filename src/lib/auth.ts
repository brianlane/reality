import { UserRole } from "@prisma/client";
import { headers } from "next/headers";

export type MockAuthContext = {
  userId: string;
  role: UserRole;
};

export async function getMockAuth(): Promise<MockAuthContext> {
  const headerList = await headers();
  const userId = headerList.get("x-mock-user-id") ?? "mock-user";
  const roleHeader = headerList.get("x-mock-user-role") ?? "APPLICANT";
  const role =
    roleHeader.toUpperCase() === "ADMIN" ? UserRole.ADMIN : UserRole.APPLICANT;

  return { userId, role };
}

export function requireAdmin(role: UserRole) {
  if (role !== UserRole.ADMIN) {
    const error = new Error("Admin access required");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
}
