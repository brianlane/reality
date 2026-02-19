"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PhotoUploadForm from "@/components/forms/PhotoUploadForm";
import { Button } from "@/components/ui/button";
import { useApplicationDraft } from "@/components/forms/useApplicationDraft";
import ResearchRouteGuard from "@/components/research/ResearchRouteGuard";
import { APP_STATUS } from "@/lib/application-status";
import { ERROR_MESSAGES } from "@/lib/error-messages";

export default function PhotosPage() {
  const router = useRouter();
  const { draft } = useApplicationDraft();
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      try {
        const response = await fetch("/api/applicant/dashboard");
        const json = await response.json().catch(() => null);
        if (cancelled) return;

        if (response.status === 401) {
          router.replace("/sign-in?next=/apply/photos");
          return;
        }

        if (!response.ok) {
          router.replace("/dashboard");
          return;
        }

        const appStatus = json?.application?.status as string | undefined;
        if (appStatus === APP_STATUS.PAYMENT_PENDING) {
          router.replace("/apply/payment");
          return;
        }

        // Only DRAFT users can access photos
        // WAITLIST_INVITED users must fill out demographics first to transition to PAYMENT_PENDING
        if (appStatus !== APP_STATUS.DRAFT) {
          router.replace("/dashboard");
          return;
        }
      } catch {
        if (!cancelled) {
          router.replace("/dashboard");
        }
      } finally {
        if (!cancelled) {
          setIsCheckingAccess(false);
        }
      }
    };

    void checkAccess();
    return () => {
      cancelled = true;
    };
  }, [router]);

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
          setIsSubmitting(false);
          router.push("/sign-in?next=/apply/photos");
          return;
        }
        setStatus(
          data?.error?.message || ERROR_MESSAGES.FAILED_SUBMIT_APPLICATION,
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
      setStatus(ERROR_MESSAGES.FAILED_SUBMIT_APPLICATION);
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
          {isCheckingAccess ? (
            <p className="text-sm text-navy-soft">Verifying access...</p>
          ) : (
            <PhotoUploadForm />
          )}
          <div className="text-sm text-navy-soft">
            Upload at least two photos, then submit to complete your
            application.
          </div>
          <Button
            onClick={handleNext}
            disabled={isSubmitting || isCheckingAccess}
          >
            {isSubmitting ? "Submitting..." : "Submit Application"}
          </Button>
          {status ? <p className="text-sm text-red-500">{status}</p> : null}
        </div>
      </section>
    </ResearchRouteGuard>
  );
}
