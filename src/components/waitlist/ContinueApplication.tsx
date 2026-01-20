"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      {/* Success Icon */}
      <div className="text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-copper">
          <span className="text-4xl">🎉</span>
        </div>
      </div>

      {/* Heading */}
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-navy">
          Welcome back, {validation.firstName}!
        </h1>
        <p className="text-lg text-navy-soft">
          A spot has opened up for you to continue your application.
        </p>
      </div>

      {/* Next Steps */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h2 className="mb-4 text-xl font-semibold text-navy">Next Steps:</h2>
        <ol className="space-y-4">
          <li className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-copper text-sm font-bold text-white">
              1
            </div>
            <div>
              <h3 className="font-semibold text-navy">Complete Your Profile</h3>
              <p className="text-sm text-navy-soft">
                Fill in your full demographic information and professional
                details.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-copper text-sm font-bold text-white">
              2
            </div>
            <div>
              <h3 className="font-semibold text-navy">
                Application Fee ($199)
              </h3>
              <p className="text-sm text-navy-soft">
                Submit your application fee to proceed with the screening
                process.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-copper text-sm font-bold text-white">
              3
            </div>
            <div>
              <h3 className="font-semibold text-navy">Full Assessment</h3>
              <p className="text-sm text-navy-soft">
                Complete our comprehensive 80-question compatibility
                questionnaire.
              </p>
            </div>
          </li>
        </ol>
      </div>

      {/* Info Note */}
      <div className="rounded-lg border-l-4 border-copper bg-copper/5 p-4">
        <p className="text-sm text-navy">
          <span className="font-semibold">Important:</span> Your invitation is
          valid for the next 7 days. Please complete your application within
          this timeframe.
        </p>
      </div>

      {/* CTA */}
      <div className="text-center">
        <Button onClick={handleContinue}>Continue Application</Button>
      </div>

      {/* Additional Info */}
      <p className="text-center text-sm text-gray-500">
        You can complete your application in multiple sessions. Your progress
        will be saved automatically.
      </p>
    </div>
  );
}
