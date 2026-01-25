"use client";

import { useRouter } from "next/navigation";
import PhotoUploadForm from "@/components/forms/PhotoUploadForm";
import { Button } from "@/components/ui/button";
import { useApplicationDraft } from "@/components/forms/useApplicationDraft";

export default function PhotosPage() {
  const router = useRouter();
  const { draft } = useApplicationDraft();

  function handleNext() {
    if (!draft.applicationId) {
      alert("Application ID not found. Please start over.");
      return;
    }

    // Redirect to password creation page
    router.push(`/apply/create-password?id=${draft.applicationId}`);
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-navy">Photo Upload</h1>
      <p className="mt-2 text-navy-soft">
        Upload at least 2 profile photos, then proceed to create your password.
      </p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <PhotoUploadForm />
        <div className="text-sm text-navy-soft">
          Upload at least two photos, then continue to the next step.
        </div>
        <Button onClick={handleNext}>Next</Button>
      </div>
    </section>
  );
}
