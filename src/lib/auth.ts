import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthUser = {
  userId: string;
  email: string | null;
};

export async function getAuthUser(): Promise<AuthUser | null> {
  const headerList = await headers();

  // E2E auth bypass - ONLY enabled in test environments
  // SECURITY: Never enable this in production
  if (
    process.env.E2E_AUTH_ENABLED === "true" &&
    process.env.NODE_ENV === "development"
  ) {
    const userId = headerList.get("x-e2e-user-id");
    const email = headerList.get("x-e2e-user-email");

    if (userId || email) {
      return {
        userId: userId ?? "e2e-user",
        email: email ?? null,
      };
    }
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const authHeader = headerList.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        return { userId: data.user.id, email: data.user.email ?? null };
      }
    }
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return { userId: data.user.id, email: data.user.email ?? null };
}

export function requireAdmin(email: string | null) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    throw new Error("ADMIN_EMAIL is not configured");
  }

  if (!email || email.toLowerCase() !== adminEmail.toLowerCase()) {
    const error = new Error("Admin access required");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
}

export function isAdminEmail(email: string | null) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || !email) {
    return false;
  }

  return email.toLowerCase() === adminEmail.toLowerCase();
}

/**
 * Enhanced admin check using database role (RBAC foundation)
 * Use this in new code instead of requireAdmin
 */
export async function requireAdminRole(
  email: string | null,
): Promise<{ userId: string; email: string; role: "ADMIN" }> {
  // First check legacy ADMIN_EMAIL for backwards compatibility
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && email?.toLowerCase() === adminEmail.toLowerCase()) {
    // Legacy admin - look up or create user
    const { db } = await import("@/lib/db");
    const user = await db.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        deletedAt: null,
      },
    });

    if (user?.role === "ADMIN") {
      return { userId: user.id, email: user.email, role: "ADMIN" };
    }
  }

  // Check database role
  if (!email) {
    const error = new Error("Admin access required");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }

  const { db } = await import("@/lib/db");
  const user = await db.user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      role: "ADMIN",
      deletedAt: null,
    },
  });

  if (!user) {
    const error = new Error("Admin access required");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }

  return { userId: user.id, email: user.email, role: "ADMIN" };
}
