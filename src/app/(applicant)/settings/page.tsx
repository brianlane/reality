"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { validatePassword } from "@/lib/utils";

export default function ApplicantSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePasswordChange = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const validation = validatePassword(newPassword, confirmPassword);
    if (!validation.valid) {
      setErrorMessage(validation.error);
      return;
    }

    setIsSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setErrorMessage("Authentication is not configured.");
      setIsSubmitting(false);
      return;
    }

    // Re-authenticate with current password first
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setErrorMessage("You must be signed in to change your password.");
      setIsSubmitting(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      setErrorMessage("Current password is incorrect.");
      setIsSubmitting(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setErrorMessage(updateError.message);
      setIsSubmitting(false);
      return;
    }

    setSuccessMessage("Password updated successfully.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Settings</h1>
        <p className="mt-1 text-sm text-navy-soft">
          Manage your account details.
        </p>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-navy">Change Password</h2>
        <p className="mt-1 text-sm text-navy-soft">
          Update your account password.
        </p>

        <form onSubmit={handlePasswordChange} className="mt-6 space-y-4">
          <div>
            <label
              className="text-sm font-medium text-navy"
              htmlFor="currentPassword"
            >
              Current Password
            </label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <label
              className="text-sm font-medium text-navy"
              htmlFor="newPassword"
            >
              New Password
            </label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <label
              className="text-sm font-medium text-navy"
              htmlFor="confirmPassword"
            >
              Confirm New Password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
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

          {successMessage ? (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              {successMessage}
            </p>
          ) : null}
          {errorMessage ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
