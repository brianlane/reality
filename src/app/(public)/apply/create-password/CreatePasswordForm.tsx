"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validatePassword } from "@/lib/utils";
import { signUpOrSignIn } from "@/lib/auth/signup-or-signin";
import { ERROR_MESSAGES } from "@/lib/error-messages";

type CreatePasswordFormProps = {
  email: string;
  applicationId: string;
};

export default function CreatePasswordForm({
  email,
  applicationId,
}: CreatePasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    // Validate password
    const validationResult = validatePassword(password, confirmPassword);
    if (!validationResult.valid) {
      setError(validationResult.error);
      setIsSubmitting(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError(ERROR_MESSAGES.AUTH_NOT_CONFIGURED);
      setIsSubmitting(false);
      return;
    }

    try {
      // Step 1: Check if user already has a session
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();

      let session = existingSession;

      if (!session) {
        // Step 2: Create account or sign in with shared fallback logic
        const authResult = await signUpOrSignIn({
          supabase,
          email: email.trim().toLowerCase(),
          password,
          emailRedirectTo: `${window.location.origin}/dashboard`,
        });
        if (authResult.errorMessage) {
          setError(authResult.errorMessage);
          setIsSubmitting(false);
          return;
        }
        session = authResult.session;
      }

      if (!session) {
        setError(ERROR_MESSAGES.FAILED_CREATE_SESSION);
        setIsSubmitting(false);
        return;
      }

      // Step 3: Submit application
      const response = await fetch("/api/applications/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(
          errorData?.error?.message ?? ERROR_MESSAGES.FAILED_SUBMIT_APPLICATION,
        );
        setIsSubmitting(false);
        return;
      }

      // Step 4: Clear localStorage and redirect to success page
      if (typeof window !== "undefined") {
        localStorage.removeItem("waitlistInviteToken");
        localStorage.removeItem("applicationId");
      }

      router.push(`/apply/waitlist?id=${applicationId}`);
    } catch (error) {
      console.error("Password creation error:", error);
      setError("An error occurred. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="text-sm font-medium text-navy" htmlFor="email">
          Email
        </label>
        <Input
          id="email"
          type="email"
          value={email}
          disabled
          className="bg-slate-50"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-navy" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-soft hover:text-navy"
          >
            {showPassword ? (
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div>
        <label
          className="text-sm font-medium text-navy"
          htmlFor="confirmPassword"
        >
          Confirm Password
        </label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-soft hover:text-navy"
          >
            {showConfirmPassword ? (
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="rounded-md bg-slate-50 p-3 text-sm text-navy-soft">
        <p className="font-medium text-navy">Password requirements:</p>
        <ul className="mt-1 list-inside list-disc space-y-1">
          <li>At least 8 characters</li>
          <li>One uppercase letter</li>
          <li>One lowercase letter</li>
          <li>One number</li>
        </ul>
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <Button className="w-full" type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit Application"}
      </Button>
    </form>
  );
}
