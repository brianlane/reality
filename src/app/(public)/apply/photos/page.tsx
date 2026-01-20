"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PhotoUploadForm from "@/components/forms/PhotoUploadForm";
import { Button } from "@/components/ui/button";
import { useApplicationDraft } from "@/components/forms/useApplicationDraft";

export default function PhotosPage() {
  const router = useRouter();
  const { draft } = useApplicationDraft();
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleFinalSubmit() {
    if (!draft.applicationId) {
      setStatus("Application ID not found. Please start over.");
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const response = await fetch("/api/applications/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: draft.applicationId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setStatus(errorData?.error?.message || "Failed to submit application.");
        setIsSubmitting(false);
        return;
      }

      // Clear invite token from localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("waitlistInviteToken");
        localStorage.removeItem("applicationId");
      }

      // Navigate to success/confirmation page
      router.push(`/apply/waitlist?id=${draft.applicationId}`);
    } catch (error) {
      console.error("Final submission error:", error);
      setStatus("An error occurred. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-navy">Photo Upload</h1>
      <p className="mt-2 text-navy-soft">
        Final Step: Upload at least 2 profile photos and submit your
        application.
      </p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <PhotoUploadForm />
        <div className="text-sm text-navy-soft">
          Upload at least two photos, then submit your application for review.
        </div>
        <Button onClick={handleFinalSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit Application"}
        </Button>
        {status && <p className="text-sm text-red-500">{status}</p>}
      </div>
    </section>
  );
}
