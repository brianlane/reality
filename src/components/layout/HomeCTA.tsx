"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function HomeCTA() {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setIsSignedIn(Boolean(data.session));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(Boolean(session));
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isSignedIn) {
    return (
      <Link
        href="/dashboard"
        className="w-full rounded-md bg-navy px-8 py-4 text-center text-base font-medium text-white hover:bg-copper transition-colors"
      >
        Dashboard
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/apply"
        className="w-full rounded-md bg-navy px-8 py-4 text-center text-base font-medium text-white hover:bg-copper transition-colors"
      >
        Join Now
      </Link>
      <Link
        href="/sign-in"
        className="w-full rounded-md border border-slate-300 px-8 py-4 text-center text-base font-medium text-navy hover:border-copper hover:text-copper transition-colors"
      >
        Sign in
      </Link>
    </>
  );
}
