"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import LogoCircles from "@/components/layout/LogoCircles";

type ContinueApplicationProps = {
  token: string;
};

type ValidationResponse = {
  valid: boolean;
  firstName: string;
  applicationId: string;
};

export default function ContinueApplication({
  token,
}: ContinueApplicationProps) {
  const router = useRouter();
  const [validation, setValidation] = useState<ValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function validateToken() {
      try {
        const response = await fetch(
          `/api/applications/validate-invite?token=${token}`,
        );

        if (!response.ok) {
          const errorData = await response.json();
          setError(
            errorData?.error?.message ||
              "Invalid or expired invitation link. Please contact support.",
          );
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        setValidation(data);
        setIsLoading(false);

        // Store token in localStorage for later use
        if (typeof window !== "undefined") {
          localStorage.setItem("waitlistInviteToken", token);
          localStorage.setItem("applicationId", data.applicationId);
          // Clear research mode to prevent cross-contamination
          localStorage.removeItem("researchMode");
          localStorage.removeItem("researchInviteCode");
        }
      } catch (err) {
        console.error("Token validation error:", err);
        setError("Failed to validate invitation. Please try again.");
        setIsLoading(false);
      }
    }

    validateToken();
  }, [token]);

  function handleContinue() {
    // Navigate to demographics page to continue application
    router.push("/apply/demographics");
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="animate-pulse space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-gray-200" />
          <div className="h-8 w-64 mx-auto bg-gray-200 rounded" />
          <div className="h-4 w-48 mx-auto bg-gray-200 rounded" />
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Validating your invitation...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-12">
        <div className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-12 w-12 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        </div>
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-navy">Invalid Invitation</h1>
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

  if (!validation) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center space-y-6 text-center">
          {/* Logo */}
          <LogoCircles />

          {/* Title */}
          <h1 className="text-3xl font-semibold text-navy">
            You&apos;ve Been Invited!
          </h1>

          {/* Description */}
          <p className="max-w-2xl text-lg text-navy-soft">
            Great news! You&apos;ve been invited off the waitlist to complete
            your full application. Click below to continue with the next steps.
          </p>

          {/* Button */}
          <div className="pt-4">
            <Button
              onClick={handleContinue}
              className="bg-navy px-8 py-4 text-base font-medium text-white transition-colors hover:bg-copper"
            >
              Complete Application
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
