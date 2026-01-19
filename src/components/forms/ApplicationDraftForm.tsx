"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useApplicationDraft } from "./useApplicationDraft";

export default function ApplicationDraftForm() {
  const router = useRouter();
  const { draft, updateDraft } = useApplicationDraft();
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const formData = new FormData(event.currentTarget);
    const applicant = {
      firstName: String(formData.get("firstName") ?? "").trim(),
      lastName: String(formData.get("lastName") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim() || null,
    };
    const demographics = {
      age: Number(formData.get("age")),
      gender: formData.get("gender"),
      location: formData.get("location"),
      occupation: formData.get("occupation"),
      employer: formData.get("employer") || null,
      education: formData.get("education"),
      incomeRange: formData.get("incomeRange"),
    };

    const response = await fetch("/api/applications/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicant,
        demographics,
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
    router.push("/apply/questionnaire");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <Input id="age" name="age" type="number" min={18} required />
      </div>
      <div>
        <label htmlFor="gender" className="text-sm font-medium text-navy-muted">
          Gender
        </label>
        <Select id="gender" name="gender" required>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
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
        <Input id="location" name="location" required />
      </div>
      <div>
        <label
          htmlFor="occupation"
          className="text-sm font-medium text-navy-muted"
        >
          Occupation
        </label>
        <Input id="occupation" name="occupation" required />
      </div>
      <div>
        <label
          htmlFor="employer"
          className="text-sm font-medium text-navy-muted"
        >
          Employer
        </label>
        <Input id="employer" name="employer" />
      </div>
      <div>
        <label
          htmlFor="education"
          className="text-sm font-medium text-navy-muted"
        >
          Education
        </label>
        <Input id="education" name="education" required />
      </div>
      <div>
        <label
          htmlFor="incomeRange"
          className="text-sm font-medium text-navy-muted"
        >
          Income Range
        </label>
        <Input id="incomeRange" name="incomeRange" required />
      </div>
      <Button type="submit">Save and continue</Button>
      {status && <p className="text-sm text-red-500">{status}</p>}
    </form>
  );
}
