"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CopperIcon } from "@/components/ui/copper-icon";
import { resetResearchDraftContext } from "./researchDraftStorage";
import { storeProlificParams, type ProlificParams } from "@/lib/research/prolific";

type ResearchInviteGateProps = {
  code: string;
  prolificParams: ProlificParams;
};

type ValidationResponse = {
  valid: boolean;
  firstName: string;
  applicationId: string;
  prolificCompletionCode?: string;
};

export default function ResearchInviteGate({ code, prolificParams }: ResearchInviteGateProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Store Prolific params immediately
    storeProlificParams(prolificParams);

    async function validateCode() {
      try {
        const response = await fetch("/api/research/validate-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            ...prolificParams,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          setError(
            errorData?.error?.message ||
              "Invalid or expired research invitation link.",
          );
          setIsLoading(false);
          return;
        }

        const data = (await response.json()) as ValidationResponse;

        if (typeof window !== "undefined") {
          localStorage.setItem("applicationId", data.applicationId);
          resetResearchDraftContext(data.applicationId);
          localStorage.setItem("researchMode", "true");
          localStorage.setItem("researchInviteCode", code);
          localStorage.removeItem("waitlistInviteToken");

          if (data.prolificCompletionCode) {
            localStorage.setItem("prolificCompletionCode", data.prolificCompletionCode);
          }
        }

        router.replace("/research/questionnaire");
      } catch (err) {
        console.error("Research invite validation error:", err);
        setError("Failed to validate invitation. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    validateCode();
  }, [code, router, prolificParams]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="animate-pulse space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-gray-200" />
          <div className="h-8 w-64 mx-auto rounded bg-gray-200" />
          <div className="h-4 w-48 mx-auto rounded bg-gray-200" />
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Validating your research invitation...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-12">
        <div className="text-center">
          <CopperIcon d="M6 18 18 6M6 6l12 12" />
        </div>
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-navy">
            Invalid Research Invitation
          </h1>
          <p className="text-navy-soft">{error}</p>
        </div>
        <div className="text-center">
          <Link href="/">
            <Button>Return to Homepage</Button>
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
