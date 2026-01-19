"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SignOutButton from "./SignOutButton";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SidebarLink = {
  href: string;
  label: string;
};

type SidebarProps = {
  title: string;
  links: SidebarLink[];
  signOutRedirect?: string;
};

export default function Sidebar({
  title,
  links,
  signOutRedirect,
}: SidebarProps) {
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
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

  return (
    <aside className="w-full border-b border-slate-200 bg-white px-6 py-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="mb-4 text-sm font-semibold text-navy-soft">{title}</div>
      <nav className="flex flex-wrap gap-3 text-sm text-navy-soft md:flex-col">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-2 py-1 hover:bg-copper hover:text-white transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      {signOutRedirect && isSignedIn ? (
        <div className="mt-6">
          <SignOutButton
            redirectTo={signOutRedirect}
            className="rounded-md px-2 py-1 text-sm text-navy-soft hover:bg-copper hover:text-white transition-colors"
          />
        </div>
      ) : null}
    </aside>
  );
}
