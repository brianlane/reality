"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { useApplicationDraft } from "./useApplicationDraft";

export default function PhotoUploadForm() {
  const { draft, updateDraft } = useApplicationDraft();
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!draft.applicationId) {
      setStatus("Complete previous steps first.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    formData.append("applicantId", draft.applicationId);

    const response = await fetch("/api/applications/upload-photo", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      setStatus("Photo upload failed.");
      return;
    }

    const data = await response.json();
    updateDraft({
      photos: [...(draft.photos ?? []), data.photoUrl],
    });
    setStatus("Photo uploaded!");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="file" name="file" accept="image/*" required />
      <Button type="submit">Upload photo</Button>
      {status && <p className="text-sm text-slate-600">{status}</p>}
    </form>
  );
}
