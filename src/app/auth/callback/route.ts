import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BLOCKED_PATH_PREFIXES = ["/admin"];

function isSafePath(path: string): boolean {
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  return !BLOCKED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const safePath = isSafePath(next) ? next : "/";

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      console.error("[auth/callback] Supabase client could not be initialized");
      return NextResponse.redirect(`${origin}/sign-in?error=auth-code-error`);
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] Code exchange failed:", error.message);
      if (safePath === "/reset-password") {
        return NextResponse.redirect(
          `${origin}/forgot-password?error=link-expired`,
        );
      }
      return NextResponse.redirect(`${origin}/sign-in?error=auth-code-error`);
    }

    return NextResponse.redirect(`${origin}${safePath}`);
  }

  return NextResponse.redirect(`${origin}/sign-in?error=auth-code-error`);
}
