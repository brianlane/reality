"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import SignOutButton from "@/components/layout/SignOutButton";

export default function NavAuthActions() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setIsSignedIn(Boolean(data.session));
    });
  }, []);

  if (isSignedIn) {
    return (
      <SignOutButton
        redirectTo="/"
        className="rounded-md border border-slate-300 px-3 py-1 text-sm text-navy hover:border-copper hover:text-copper transition-colors"
      />
    );
  }

  return (
    <Link
      href="/sign-in"
      className="rounded-md border border-slate-300 px-3 py-1 text-sm text-navy hover:border-copper hover:text-copper transition-colors"
    >
      Sign in
    </Link>
  );
}
