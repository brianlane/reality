"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

type WaitlistConfirmationProps = {
  applicationId: string;
  firstName?: string;
};

export default function WaitlistConfirmation({
  applicationId,
  firstName,
}: WaitlistConfirmationProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      {/* Success Icon */}
      <div className="text-center">
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
      </div>

      {/* Heading */}
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-navy">
          You&apos;re on the Waitlist
        </h1>
        {firstName && (
          <p className="text-lg text-navy-soft">
            Thank you for your interest, {firstName}.
          </p>
        )}
      </div>

      {/* What Happens Next */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h2 className="mb-4 text-xl font-semibold text-navy">
          What happens next?
        </h2>
        <ol className="space-y-4">
          <li className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-copper text-sm font-bold text-white">
              1
            </div>
            <div>
              <h3 className="font-semibold text-navy">
                We review your qualification
              </h3>
              <p className="text-sm text-navy-soft">
                Our team will carefully review your information to ensure
                you&apos;re a great fit for Reality Matchmaking.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-copper text-sm font-bold text-white">
              2
            </div>
            <div>
              <h3 className="font-semibold text-navy">
                You&apos;ll receive an invitation email
              </h3>
              <p className="text-sm text-navy-soft">
                When a spot opens up, we&apos;ll send you an email invitation to
                continue your application.
              </p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-copper text-sm font-bold text-white">
              3
            </div>
            <div>
              <h3 className="font-semibold text-navy">
                Complete your full application
              </h3>
              <p className="text-sm text-navy-soft">
                Finish your profile, submit the application fee, and complete
                our comprehensive assessment.
              </p>
            </div>
          </li>
        </ol>
      </div>

      {/* Timeline */}
      <div className="rounded-lg border-l-4 border-copper bg-copper/5 p-4">
        <p className="text-sm text-navy">
          <span className="font-semibold">Timeline:</span> We typically review
          applications within 2-4 weeks. We&apos;ll notify you as soon as a spot
          opens up.
        </p>
      </div>

      {/* Application Reference */}
      <div className="rounded-lg bg-gray-100 p-4">
        <p className="text-center text-sm text-navy-muted">
          <span className="font-semibold">Application Reference:</span>
        </p>
        <p className="mt-1 text-center font-mono text-xs text-navy">
          {applicationId}
        </p>
      </div>

      {/* CTA */}
      <div className="text-center">
        <Link href="/">
          <Button>Return to Homepage</Button>
        </Link>
      </div>

      {/* Additional Info */}
      <p className="text-center text-sm text-gray-500">
        Check your email (including spam folder) for updates on your application
        status.
      </p>
    </div>
  );
}
