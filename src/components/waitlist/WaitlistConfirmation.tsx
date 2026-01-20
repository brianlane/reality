"use client";

type WaitlistConfirmationProps = {
  firstName?: string;
};

export default function WaitlistConfirmation({
  firstName,
}: WaitlistConfirmationProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      {/* Success Icon */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
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
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-navy">
            You&apos;re on the Waitlist
          </h1>
          <p className="text-lg text-navy-soft">
            Thank you for your interest{firstName ? `, ${firstName}` : ""}.
          </p>
        </div>
      </div>
    </div>
  );
}
