"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if we have a valid session (from the reset link)
    const checkSession = async () => {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        setIsValidToken(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      setIsValidToken(!!session);
    };

    checkSession();
  }, []);

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

    // Update the user's password
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setIsSubmitting(false);
      return;
    }

    // Redirect to sign in with success message
    router.push("/sign-in?reset=success");
  };

  // Show loading state while checking token
  if (isValidToken === null) {
    return (
      <div className="mt-8">
        <p className="text-center text-navy-soft">Verifying reset link...</p>
      </div>
    );
  }

  // Show error if token is invalid
  if (isValidToken === false) {
    return (
      <div className="mt-8 space-y-4">
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">
            This password reset link is invalid or has expired. Please request
            a new one.
          </p>
        </div>

        <Link href="/forgot-password">
          <Button className="w-full">Request New Reset Link</Button>
        </Link>

        <p className="text-center text-sm text-navy-soft">
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
        <label className="text-sm font-medium text-navy" htmlFor="password">
          New Password
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
          Confirm New Password
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
        {isSubmitting ? "Resetting..." : "Reset Password"}
      </Button>
    </form>
  );
}
