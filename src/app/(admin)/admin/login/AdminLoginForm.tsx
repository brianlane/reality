"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AdminLoginFormProps = {
  forceSignOut: boolean;
  adminEmailMissing: boolean;
};

export default function AdminLoginForm({
  forceSignOut,
  adminEmailMissing,
}: AdminLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!forceSignOut) return;

    const signOut = async () => {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      setError("This account is not authorized for admin access.");
    };

    signOut();
  }, [forceSignOut]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const supabase = createSupabaseBrowserClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setIsSubmitting(false);
      return;
    }

    const next = searchParams.get("next") ?? "/admin";
    router.replace(next);
    router.refresh();
  };

  return (
    <section className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="text-3xl font-semibold text-navy">Admin sign in</h1>
      <p className="mt-2 text-sm text-navy-soft">
        Use the admin credentials to access the admin dashboard.
      </p>

      {adminEmailMissing ? (
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          ADMIN_EMAIL is not configured. Admin access is disabled.
        </p>
      ) : null}

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="text-sm font-medium text-navy" htmlFor="email">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-navy" htmlFor="password">
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error ? (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <Button className="w-full" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-navy-soft">
        Looking for the client portal?{" "}
        <Link className="text-copper hover:underline" href="/sign-in">
          Sign in here
        </Link>
        .
      </p>
    </section>
  );
}
