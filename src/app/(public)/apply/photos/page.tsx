"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import PhotoUploadForm from "@/components/forms/PhotoUploadForm";
import { Button } from "@/components/ui/button";
import { useApplicationDraft } from "@/components/forms/useApplicationDraft";
import ResearchRouteGuard from "@/components/research/ResearchRouteGuard";

export default function PhotosPage() {
  const router = useRouter();
  const { draft } = useApplicationDraft();
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleNext() {
    setStatus(null);
    if (!draft.applicationId) {
      setStatus("Application ID not found. Please start over.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/applications/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: draft.applicationId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        if (response.status === 401) {
          router.push(`/apply/create-password?id=${draft.applicationId}`);
          return;
        }
        setStatus(
          data?.error?.message ||
            "Failed to submit application. Please try again.",
        );
        setIsSubmitting(false);
        return;
      }

      if (typeof window !== "undefined") {
        localStorage.removeItem("waitlistInviteToken");
        localStorage.removeItem("applicationId");
      }

      router.push(`/apply/waitlist?id=${draft.applicationId}`);
    } catch {
      setStatus("Failed to submit application. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <ResearchRouteGuard>
      <section className="mx-auto w-full max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold text-navy">Photo Upload</h1>
        <p className="mt-2 text-navy-soft">
          Upload at least 2 profile photos, then submit your application.
        </p>
        <div className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6">
          <PhotoUploadForm />
          <div className="text-sm text-navy-soft">
            Upload at least two photos, then submit to complete your
            application.
          </div>
          <Button onClick={handleNext} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Application"}
          </Button>
          {status ? <p className="text-sm text-red-500">{status}</p> : null}
        </div>
      </section>
    </ResearchRouteGuard>
  );
}
