import { headers } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthUser = {
  userId: string;
  email: string | null;
};

export async function getAuthUser(): Promise<AuthUser | null> {
  const headerList = await headers();
  if (process.env.E2E_AUTH_ENABLED === "true") {
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
