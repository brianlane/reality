"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import SignOutButton from "@/components/layout/SignOutButton";

export default function NavAuthActions() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      // Supabase not configured, stay signed out
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setIsSignedIn(Boolean(data.session));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(Boolean(session));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (isSignedIn) {
    return (
      <SignOutButton
        redirectTo="/"
        className="rounded-md border border-slate-300 px-3 py-1 text-sm text-navy hover:border-copper hover:text-copper transition-colors"
      />
    );
  }

  // Hide sign in button on sign-in and admin login pages
  if (pathname === "/sign-in" || pathname === "/admin/login") {
    return null;
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
