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
        className="text-base font-semibold text-navy-soft hover:text-copper transition-colors"
      />
    );
  }

  const isActive = pathname === "/sign-in" || pathname === "/admin/login";

  return (
    <Link
      href="/sign-in"
      className={`text-center transition-colors text-base ${
        isActive ? "text-copper" : "text-navy-soft hover:text-copper"
      }`}
    >
      Sign in
    </Link>
  );
}
