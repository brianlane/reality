"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import NavAuthActions from "./NavAuthActions";
import { useIsSignedIn } from "@/hooks/useIsSignedIn";

export default function Navbar() {
  const pathname = usePathname();
  const isSignedIn = useIsSignedIn();

  const staticLinks = [
    { href: "/purpose", label: "Purpose", external: false },
    {
      href: "mailto:contact@realitymatchmaking.com",
      label: "Contact",
      external: true,
    },
  ];

  const firstLink = isSignedIn
    ? { href: "/dashboard", label: "Dashboard", external: false }
    : { href: "/apply", label: "Join Now", external: false };

  const navLinks = [firstLink, ...staticLinks];

  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-center gap-10 px-6 py-6 text-base font-semibold">
        <Link href="/">
          <Logo size="icon" />
        </Link>
        {navLinks.map((link) => {
          if (link.external) {
            return (
              <a
                key={link.href}
                href={link.href}
                className="text-navy-soft transition-colors hover:text-copper"
              >
                {link.label}
              </a>
            );
          }

          const isActive = pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`transition-colors ${
                isActive ? "text-copper" : "text-navy-soft hover:text-copper"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        <NavAuthActions isSignedIn={isSignedIn} />
      </nav>
    </header>
  );
}
