import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export async function getAuthHeaders() {
  if (
    typeof window !== "undefined" &&
    (window as { __E2E_AUTH_HEADERS__?: Record<string, string> })
      .__E2E_AUTH_HEADERS__
  ) {
    return (window as { __E2E_AUTH_HEADERS__?: Record<string, string> })
      .__E2E_AUTH_HEADERS__!;
  }

  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session?.access_token) {
    return null;
  }

  return {
    Authorization: `Bearer ${data.session.access_token}`,
  };
}
