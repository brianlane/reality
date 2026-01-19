import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AccountInitOptions = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
};

export async function ensureApplicantAccount({
  email,
  firstName,
  lastName,
}: AccountInitOptions) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return { status: "skipped" as const };
  }

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: fullName ? { full_name: fullName } : undefined,
  });

  if (error) {
    if (error.message.toLowerCase().includes("already")) {
      return { status: "exists" as const };
    }
    return { status: "error" as const, error };
  }

  return { status: "invited" as const };
}
