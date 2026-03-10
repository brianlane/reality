"use client";

import Link from "next/link";

type WaitlistConfirmationProps = {
  firstName?: string;
  isSubmitted?: boolean;
  applicationId?: string;
  needsFcraConsent?: boolean;
};

export default function WaitlistConfirmation({
  firstName,
  isSubmitted = false,
  applicationId,
  needsFcraConsent = false,
}: WaitlistConfirmationProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div className="rounded-lg border border-gray-200 bg-white p-10 text-center space-y-6">
        {/* Success Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-copper">
          <svg
            className="h-12 w-12 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {isSubmitted ? (
          <>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-navy">
                Application Submitted
              </h1>
              <p className="text-navy-soft">
                Your application has been submitted and is currently under
                review. We&apos;ll notify you once we&apos;ve reviewed your
                submission.
              </p>
              {needsFcraConsent && (
                <p className="text-navy-soft mt-4">
                  To complete your application review, please authorize our
                  background check process.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
              {needsFcraConsent && applicationId && (
                <Link
                  href={`/apply/background-check-consent?id=${applicationId}`}
                  className="inline-flex items-center justify-center rounded-md bg-navy px-6 py-3 text-sm font-medium text-white transition hover:bg-navy/90"
                >
                  Complete Background Check Authorization
                </Link>
              )}
              <Link
                href="/dashboard"
                className={`inline-flex items-center justify-center rounded-md px-6 py-3 text-sm font-medium transition ${
                  needsFcraConsent
                    ? "border border-navy text-navy hover:bg-navy/5"
                    : "bg-navy text-white hover:bg-navy/90"
                }`}
              >
                View Dashboard
              </Link>
            </div>
            {applicationId && (
              <p className="text-xs text-navy-soft/60">
                Application ID: {applicationId}
              </p>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-navy">
              You&apos;re on the Waitlist
            </h1>
            <p className="text-lg text-navy-soft">
              Thank you for your interest{firstName ? `, ${firstName}` : ""}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
