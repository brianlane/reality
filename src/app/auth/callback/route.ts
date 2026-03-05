import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BLOCKED_PATH_PREFIXES = ["/admin"];

function getSafePath(next: string): string {
  // Reject non-relative and protocol-relative paths on the raw value first,
  // before normalization strips the leading "//" (e.g. "//evil.com/foo").
  if (!next.startsWith("/") || next.startsWith("//")) return "/";
  // Normalize dot segments so "/foo/../admin" resolves to "/admin" before the
  // blocked-prefix check, matching what the browser will actually navigate to.
  const normalized = new URL(next, "http://n").pathname;
  if (BLOCKED_PATH_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return "/";
  }
  return normalized;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  const safePath = getSafePath(next);

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
