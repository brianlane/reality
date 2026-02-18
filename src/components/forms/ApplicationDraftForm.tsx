"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useApplicationDraft } from "./useApplicationDraft";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/utils";
import { signUpOrSignIn } from "@/lib/auth/signup-or-signin";
import { ERROR_MESSAGES } from "@/lib/error-messages";

export default function ApplicationDraftForm({
  previewMode = false,
}: {
  previewMode?: boolean;
}) {
  const router = useRouter();
  const { draft, updateDraft } = useApplicationDraft();
  const [status, setStatus] = useState<string | null>(null);
  const [isLoadingExistingData, setIsLoadingExistingData] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Fetch existing applicant data to pre-fill form (for waitlist invitees)
  useEffect(() => {
    if (previewMode) return;

    const storedApplicationId =
      typeof window !== "undefined"
        ? localStorage.getItem("applicationId")
        : null;
    const inviteTokenRaw =
      typeof window !== "undefined"
        ? localStorage.getItem("waitlistInviteToken")
        : null;
    const inviteToken = inviteTokenRaw ?? undefined;
    const draftBelongsToCurrentApplication =
      !!draft.applicationId && draft.applicationId === storedApplicationId;

    // Only prefill when we have both application + invite token.
    // If local draft already belongs to the same application, skip the fetch.
    if (
      !storedApplicationId ||
      !inviteToken ||
      (draftBelongsToCurrentApplication && draft.firstName)
    ) {
      return;
    }
    const inviteTokenForFetch = inviteToken;

    let cancelled = false;

    async function fetchApplicantData() {
      setIsLoadingExistingData(true);
      try {
        const res = await fetch(
          `/api/applications/${storedApplicationId}?token=${encodeURIComponent(inviteTokenForFetch)}`,
        );
        if (!res.ok) {
          console.error("Failed to fetch existing applicant data");
          return;
        }
        const data = await res.json();

        if (cancelled) return;

        // Pre-fill the draft with existing data
        updateDraft({
          applicationId: storedApplicationId ?? undefined,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          age: data.age,
          gender: data.gender,
          seeking: data.seeking,
          location: data.location,
          cityFrom: data.cityFrom,
          occupation: data.occupation,
          industry: data.industry,
          employer: data.employer,
          education: data.education,
          incomeRange: data.incomeRange,
          referredBy: data.referredBy,
          aboutYourself: data.aboutYourself,
        });
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching applicant data:", err);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingExistingData(false);
        }
      }
    }

    fetchApplicantData();

    return () => {
      cancelled = true;
    };
  }, [previewMode, draft.applicationId, draft.firstName, updateDraft]);

  function handlePasswordChange(value: string) {
    setPassword(value);
    // Only validate if confirm password has been entered
    if (confirmPassword) {
      const validation = validatePassword(value, confirmPassword);
      setPasswordError(validation.valid ? null : validation.error);
    } else if (passwordError) {
      // Clear error if confirm password is empty
      setPasswordError(null);
    }
  }

  function handleConfirmPasswordChange(value: string) {
    setConfirmPassword(value);
    // Validate as soon as user starts typing in confirm field
    const validation = validatePassword(password, value);
    setPasswordError(validation.valid ? null : validation.error);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setStatus(null);

    if (previewMode) {
      setStatus(ERROR_MESSAGES.PREVIEW_MODE_SUBMIT_DISABLED);
      setIsSubmitting(false);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const applicant = {
      firstName: String(formData.get("firstName") ?? "").trim(),
      lastName: String(formData.get("lastName") ?? "").trim(),
      email: String(formData.get("email") ?? "")
        .trim()
        .toLowerCase(),
      phone: String(formData.get("phone") ?? "").trim() || null,
    };
    const demographics = {
      age: Number(formData.get("age")),
      gender: formData.get("gender"),
      seeking: formData.get("seeking"),
      location: formData.get("location"),
      cityFrom: formData.get("cityFrom"),
      industry: formData.get("industry"),
      occupation: formData.get("occupation"),
      employer: formData.get("employer") || null,
      education: formData.get("education"),
      incomeRange: formData.get("incomeRange"),
      referredBy: formData.get("referredBy") || null,
      aboutYourself: String(formData.get("aboutYourself") ?? "").trim(),
    };

    // Validate password one final time before submission
    const passwordValidation = validatePassword(password, confirmPassword);
    if (!passwordValidation.valid) {
      setPasswordError(passwordValidation.error);
      setStatus(passwordValidation.error);
      setIsSubmitting(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setStatus(ERROR_MESSAGES.AUTH_NOT_CONFIGURED);
      setIsSubmitting(false);
      return;
    }

    // Retrieve waitlist invite token and application id if present
    const inviteToken =
      typeof window !== "undefined"
        ? localStorage.getItem("waitlistInviteToken")
        : null;
    const storedApplicationId =
      typeof window !== "undefined"
        ? localStorage.getItem("applicationId")
        : null;
    const applicationId =
      draft.applicationId ?? storedApplicationId ?? undefined;

    try {
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();

      let session = existingSession;
      if (!session) {
        const authResult = await signUpOrSignIn({
          supabase,
          email: applicant.email,
          password,
          emailRedirectTo: `${window.location.origin}/dashboard`,
        });
        if (authResult.errorMessage) {
          setStatus(authResult.errorMessage);
          setIsSubmitting(false);
          return;
        }
        session = authResult.session;
      }

      if (!session) {
        setStatus(ERROR_MESSAGES.FAILED_CREATE_SESSION);
        setIsSubmitting(false);
        return;
      }

      const response = await fetch("/api/applications/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant,
          applicationId,
          demographics,
          ...(inviteToken ? { inviteToken } : {}),
        }),
      });

      if (!response.ok) {
        setStatus(ERROR_MESSAGES.FAILED_SAVE_APPLICATION);
        setIsSubmitting(false);
        return;
      }

      const data = await response.json();
      updateDraft({
        applicationId: data.applicationId,
        demographics,
        ...applicant,
      });

      if (typeof window !== "undefined") {
        localStorage.setItem("applicationId", data.applicationId);
      }

      if (data.status === "DRAFT") {
        router.push("/apply/questionnaire");
      } else {
        router.push("/apply/payment");
      }
    } catch (error) {
      console.error("Demographics submit error:", error);
      setStatus("Failed to save application.");
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4"
      key={draft.firstName || "empty"}
    >
      {isLoadingExistingData && (
        <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-800">
          Loading your information from waitlist...
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label
            htmlFor="firstName"
            className="text-sm font-medium text-navy-muted"
          >
            First name
          </label>
          <Input
            id="firstName"
            name="firstName"
            defaultValue={draft.firstName ?? ""}
            required
          />
        </div>
        <div>
          <label
            htmlFor="lastName"
            className="text-sm font-medium text-navy-muted"
          >
            Last name
          </label>
          <Input
            id="lastName"
            name="lastName"
            defaultValue={draft.lastName ?? ""}
            required
          />
        </div>
      </div>
      <div>
        <label htmlFor="email" className="text-sm font-medium text-navy-muted">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={draft.email ?? ""}
          required
        />
      </div>
      <div>
        <label htmlFor="phone" className="text-sm font-medium text-navy-muted">
          Phone (optional)
        </label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={draft.phone ?? ""}
        />
      </div>
      <div>
        <label htmlFor="age" className="text-sm font-medium text-navy-muted">
          Age
        </label>
        <Input
          id="age"
          name="age"
          type="number"
          min={24}
          max={41}
          defaultValue={draft.age ?? ""}
          required
        />
      </div>
      <div>
        <label htmlFor="gender" className="text-sm font-medium text-navy-muted">
          Gender
        </label>
        <Select
          id="gender"
          name="gender"
          defaultValue={draft.gender ?? ""}
          required
        >
          <option value="">Select gender</option>
          <option value="MAN">Man</option>
          <option value="WOMAN">Woman</option>
          <option value="NON_BINARY">Non-binary</option>
          <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
        </Select>
      </div>
      <div>
        <label
          htmlFor="seeking"
          className="text-sm font-medium text-navy-muted"
        >
          Seeking
        </label>
        <Select
          id="seeking"
          name="seeking"
          defaultValue={draft.seeking ?? ""}
          required
        >
          <option value="">Select seeking preference</option>
          <option value="MAN">Man</option>
          <option value="WOMAN">Woman</option>
          <option value="NON_BINARY">Non-binary</option>
          <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
        </Select>
      </div>
      <div>
        <label
          htmlFor="location"
          className="text-sm font-medium text-navy-muted"
        >
          Location
        </label>
        <Input
          id="location"
          name="location"
          defaultValue={draft.location ?? ""}
          required
        />
      </div>
      <div>
        <label
          htmlFor="cityFrom"
          className="text-sm font-medium text-navy-muted"
        >
          City you are from (Hometown)
        </label>
        <Input
          id="cityFrom"
          name="cityFrom"
          defaultValue={draft.cityFrom ?? ""}
          required
        />
      </div>
      <div>
        <label
          htmlFor="occupation"
          className="text-sm font-medium text-navy-muted"
        >
          Occupation
        </label>
        <Input
          id="occupation"
          name="occupation"
          defaultValue={draft.occupation ?? ""}
          required
        />
      </div>
      <div>
        <label
          htmlFor="industry"
          className="text-sm font-medium text-navy-muted"
        >
          Industry
        </label>
        <Input
          id="industry"
          name="industry"
          defaultValue={draft.industry ?? ""}
          required
        />
      </div>
      <div>
        <label
          htmlFor="employer"
          className="text-sm font-medium text-navy-muted"
        >
          Employer
        </label>
        <Input
          id="employer"
          name="employer"
          defaultValue={draft.employer ?? ""}
        />
      </div>
      <div>
        <label
          htmlFor="education"
          className="text-sm font-medium text-navy-muted"
        >
          Education
        </label>
        <Input
          id="education"
          name="education"
          defaultValue={draft.education ?? ""}
          required
        />
      </div>
      <div>
        <label
          htmlFor="incomeRange"
          className="text-sm font-medium text-navy-muted"
        >
          Select your current income range
        </label>
        <Select
          id="incomeRange"
          name="incomeRange"
          defaultValue={draft.incomeRange ?? ""}
          required
        >
          <option value="">Select income range</option>
          <option value="<100k">&lt;100k</option>
          <option value="100k-200k">100k-200k</option>
          <option value="200k-250k">200k-250k</option>
          <option value="250k-300k">250k-300k</option>
          <option value="300k-400k">300k-400k</option>
          <option value="400k-500k">400k-500k</option>
          <option value="500k-750k">500k-750k</option>
          <option value="750K-1M">750K-1M</option>
          <option value="1M+">1M+</option>
          <option value="2M+">2M+</option>
          <option value="5M+">5M+</option>
          <option value="20M+">20M+</option>
        </Select>
      </div>
      <div>
        <label
          htmlFor="referredBy"
          className="text-sm font-medium text-navy-muted"
        >
          Referred by someone? (optional)
        </label>
        <Input
          id="referredBy"
          name="referredBy"
          defaultValue={draft.referredBy ?? ""}
        />
      </div>
      <div>
        <label
          htmlFor="aboutYourself"
          className="text-sm font-medium text-navy-muted"
        >
          Tell us about yourself
        </label>
        <Textarea
          id="aboutYourself"
          name="aboutYourself"
          rows={4}
          minLength={50}
          maxLength={500}
          defaultValue={draft.aboutYourself ?? ""}
          required
          placeholder="Share what makes you unique, your interests, values, or what you're passionate about..."
        />
      </div>
      <div className="rounded-md bg-slate-50 p-3 text-sm text-navy-soft">
        <p className="font-medium text-navy">Create your password</p>
        <p className="mt-1">
          You will use this password to sign in and continue your application.
        </p>
      </div>
      <div>
        <label
          htmlFor="password"
          className="text-sm font-medium text-navy-muted"
        >
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
          aria-invalid={!!passwordError}
        />
      </div>
      <div>
        <label
          htmlFor="confirmPassword"
          className="text-sm font-medium text-navy-muted"
        >
          Confirm Password
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => handleConfirmPasswordChange(e.target.value)}
          aria-invalid={!!passwordError}
        />
        {passwordError && (
          <p className="mt-1 text-sm text-red-500">{passwordError}</p>
        )}
      </div>
      <Button type="submit" disabled={isSubmitting || !!passwordError}>
        {isSubmitting ? "Saving..." : "Save and continue"}
      </Button>
      {status && <p className="text-sm text-red-500">{status}</p>}
    </form>
  );
}
