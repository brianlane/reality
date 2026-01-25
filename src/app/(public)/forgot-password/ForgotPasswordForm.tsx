"use client";

import { useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    setStatus("idle");

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Authentication is not configured.");
      setStatus("error");
      setIsSubmitting(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/reset-password`,
      },
    );

    if (resetError) {
      // For security, we always show success to prevent email enumeration
      // But log the error for debugging
      console.error("Password reset error:", resetError);
    }

    // Always show success to prevent email enumeration
    setStatus("success");
    setIsSubmitting(false);
  };

  if (status === "success") {
    return (
      <div className="mt-8 space-y-4">
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-800">
            If an account exists with that email, you'll receive a password
            reset link shortly. Please check your inbox and spam folder.
          </p>
        </div>

        <p className="text-sm text-navy-soft">
          Remember your password?{" "}
          <Link className="text-copper hover:underline" href="/sign-in">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
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

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Sending..." : "Send Reset Link"}
      </Button>

      <p className="text-sm text-navy-soft">
        Remember your password?{" "}
        <Link className="text-copper hover:underline" href="/sign-in">
          Sign in
        </Link>
      </p>
    </form>
  );
}
