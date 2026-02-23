"use client";

import Link from "next/link";
import { useIsSignedIn } from "@/hooks/useIsSignedIn";

export default function HomeCTA() {
  const isSignedIn = useIsSignedIn();

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
