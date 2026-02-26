"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LogoCircles from "@/components/layout/LogoCircles";
import { resetResearchDraftContext } from "./researchDraftStorage";
import {
  clearProlificParams,
  hasValidProlificParams,
  storeProlificParams,
  type ProlificParams,
} from "@/lib/research/prolific-client";

type ResearchSelfRegistrationProps = {
  prolificParams: ProlificParams;
};

export default function ResearchSelfRegistration({
  prolificParams,
}: ResearchSelfRegistrationProps) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Store Prolific params on mount
  useEffect(() => {
    if (hasValidProlificParams(prolificParams)) {
      storeProlificParams(prolificParams);
      return;
    }
    clearProlificParams();
  }, [prolificParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      firstName: String(formData.get("firstName") ?? "").trim(),
      lastName: String(formData.get("lastName") ?? "").trim(),
      email: String(formData.get("email") ?? "")
        .trim()
        .toLowerCase(),
      ...prolificParams,
    };

    try {
      const response = await fetch("/api/research/self-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setStatus(
          errorData?.error?.message || "Failed to start research process.",
        );
        setIsSubmitting(false);
        return;
      }

      const data = await response.json();

      // Set research mode in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("applicationId", data.applicationId);
        resetResearchDraftContext(data.applicationId);
        localStorage.setItem("researchMode", "true");
        localStorage.removeItem("waitlistInviteToken");
        localStorage.removeItem("researchInviteCode");

        if (data.prolificCompletionCode) {
          localStorage.setItem(
            "prolificCompletionCode",
            data.prolificCompletionCode,
          );
        } else {
          localStorage.removeItem("prolificCompletionCode");
        }
      }

      // Redirect to research questionnaire
      router.push("/research/questionnaire");
    } catch (error) {
      console.error("Research self-registration error:", error);
      setStatus("An error occurred. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center space-y-6 text-center">
          {/* Logo */}
          <LogoCircles />

          {/* Title */}
          <h1 className="text-3xl font-semibold text-navy">
            Join Our Research Study
          </h1>

          {/* Description */}
          <p className="max-w-2xl text-lg text-navy-soft">
            Help us understand what makes great matches by participating in our
            research study. Your responses will help improve our matching
            algorithm.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
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
                required
                disabled={isSubmitting}
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
                required
                disabled={isSubmitting}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="email"
              className="text-sm font-medium text-navy-muted"
            >
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              disabled={isSubmitting}
            />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-navy px-8 py-4 text-base font-medium text-white transition-colors hover:bg-copper"
          >
            {isSubmitting ? "Starting..." : "Start Research Questionnaire"}
          </Button>
          {status && (
            <p className="text-sm text-red-500 text-center">{status}</p>
          )}
        </form>
      </div>
    </div>
  );
}
