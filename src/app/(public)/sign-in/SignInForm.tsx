"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getSafeNext = () => {
    const next = searchParams.get("next") ?? "/dashboard";
    if (!next.startsWith("/") || next.startsWith("//")) {
      return "/dashboard";
    }
    return next;
  };

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

    router.replace(getSafeNext());
    router.refresh();
  };

  return (
    <section className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="text-3xl font-semibold text-navy">Sign in</h1>

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
        Ready to apply?{" "}
        <Link className="text-copper hover:underline" href="/apply">
          Start an application
        </Link>
        .
      </p>
    </section>
  );
}
