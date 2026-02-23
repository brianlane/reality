"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import SignOutButton from "@/components/layout/SignOutButton";

type Props = {
  isSignedIn: boolean;
};

export default function NavAuthActions({ isSignedIn }: Props) {
  const pathname = usePathname();

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
