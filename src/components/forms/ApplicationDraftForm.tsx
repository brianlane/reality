"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useApplicationDraft } from "./useApplicationDraft";

export default function ApplicationDraftForm({
  previewMode = false,
}: {
  previewMode?: boolean;
}) {
  const router = useRouter();
  const { draft, updateDraft } = useApplicationDraft();
  const [status, setStatus] = useState<string | null>(null);
  const [isLoadingExistingData, setIsLoadingExistingData] = useState(false);

  // Fetch existing applicant data to pre-fill form (for waitlist invitees)
  useEffect(() => {
    if (previewMode) return;

    const storedApplicationId =
      typeof window !== "undefined"
        ? localStorage.getItem("applicationId")
        : null;

    // Only fetch if we have an applicationId and haven't already populated the draft
    if (!storedApplicationId || draft.firstName) {
      return;
    }

    let cancelled = false;

    async function fetchApplicantData() {
      setIsLoadingExistingData(true);
      try {
        const res = await fetch(`/api/applications/${storedApplicationId}`);
        if (!res.ok) {
          console.error("Failed to fetch existing applicant data");
          return;
        }
        const data = await res.json();

        if (cancelled) return;

        // Pre-fill the draft with existing data
        updateDraft({
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
  }, [previewMode, draft.firstName, updateDraft]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (previewMode) {
      setStatus("Preview mode - form submission is disabled");
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
      setStatus("Failed to save application.");
      return;
    }

    const data = await response.json();
    updateDraft({
      applicationId: data.applicationId,
      demographics,
      ...applicant,
    });
    router.push("/apply/payment");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          City you are from
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
          Career
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
      <Button type="submit">Save and continue</Button>
      {status && <p className="text-sm text-red-500">{status}</p>}
    </form>
  );
}
