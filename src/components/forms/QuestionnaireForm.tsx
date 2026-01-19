"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useApplicationDraft } from "./useApplicationDraft";

export default function QuestionnaireForm() {
  const router = useRouter();
  const { draft, updateDraft } = useApplicationDraft();
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!draft.demographics) {
      setStatus("Please complete demographics first.");
      return;
    }
    if (!draft.firstName || !draft.lastName || !draft.email) {
      setStatus("Please complete contact details first.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const questionnaire = {
      religionImportance: Number(formData.get("religionImportance")),
      politicalAlignment: formData.get("politicalAlignment"),
      familyImportance: Number(formData.get("familyImportance")),
      careerAmbition: Number(formData.get("careerAmbition")),
      aboutMe: formData.get("aboutMe"),
      idealPartner: formData.get("idealPartner"),
      responses: {},
    };

    const response = await fetch("/api/applications/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicant: {
          firstName: draft.firstName,
          lastName: draft.lastName,
          email: draft.email.trim().toLowerCase(),
          phone: draft.phone ?? null,
        },
        applicationId: draft.applicationId,
        demographics: draft.demographics,
        questionnaire,
      }),
    });

    if (!response.ok) {
      setStatus("Failed to save questionnaire.");
      return;
    }

    updateDraft({ questionnaire });
    router.push("/apply/photos");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="religionImportance"
          className="text-sm font-medium text-navy-muted"
        >
          Religion importance (1-5)
        </label>
        <Input
          id="religionImportance"
          name="religionImportance"
          type="number"
          min={1}
          max={5}
          required
        />
      </div>
      <div>
        <label
          htmlFor="politicalAlignment"
          className="text-sm font-medium text-navy-muted"
        >
          Political alignment
        </label>
        <Input id="politicalAlignment" name="politicalAlignment" required />
      </div>
      <div>
        <label
          htmlFor="familyImportance"
          className="text-sm font-medium text-navy-muted"
        >
          Family importance (1-5)
        </label>
        <Input
          id="familyImportance"
          name="familyImportance"
          type="number"
          min={1}
          max={5}
          required
        />
      </div>
      <div>
        <label
          htmlFor="careerAmbition"
          className="text-sm font-medium text-navy-muted"
        >
          Career ambition (1-5)
        </label>
        <Input
          id="careerAmbition"
          name="careerAmbition"
          type="number"
          min={1}
          max={5}
          required
        />
      </div>
      <div>
        <label
          htmlFor="aboutMe"
          className="text-sm font-medium text-navy-muted"
        >
          About me
        </label>
        <Textarea id="aboutMe" name="aboutMe" required rows={4} />
      </div>
      <div>
        <label
          htmlFor="idealPartner"
          className="text-sm font-medium text-navy-muted"
        >
          Ideal partner
        </label>
        <Textarea id="idealPartner" name="idealPartner" required rows={4} />
      </div>
      <Button type="submit">Save and continue</Button>
      {status && <p className="text-sm text-red-500">{status}</p>}
    </form>
  );
}
