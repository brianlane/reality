"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

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

  const validatePassword = () => {
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least one uppercase letter");
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setError("Password must contain at least one lowercase letter");
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setError("Password must contain at least one number");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    // Validate password
    if (!validatePassword()) {
      setIsSubmitting(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Authentication is not configured.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Step 1: Create Supabase account
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes("already registered")) {
          setError(
            "An account with this email already exists. Please sign in instead.",
          );
        } else {
          setError(signUpError.message);
        }
        setIsSubmitting(false);
        return;
      }

      // Step 2: Sign in automatically (signUp should have signed us in already)
      // Verify we're signed in by getting the session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Failed to create session. Please try signing in.");
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
          errorData?.error?.message || "Failed to submit application.",
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
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
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
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
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
