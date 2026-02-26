"use client";

import { useEffect, useState } from "react";
import { CopperIcon } from "@/components/ui/copper-icon";

export default function ResearchThankYouPage() {
  const [redirecting, setRedirecting] = useState(false);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // Check for Prolific completion code
    const completionCode = localStorage.getItem('prolificCompletionCode');
    const applicationId = localStorage.getItem('applicationId');

    if (completionCode && applicationId) {
      setRedirecting(true);

      // Track redirect in database
      fetch('/api/research/prolific-redirect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      }).catch(err => {
        console.error('Failed to track Prolific redirect:', err);
        // Don't block redirect on tracking failure
      });

      // Countdown timer
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Perform redirect
            const redirectUrl = `https://app.prolific.com/submissions/complete?cc=${completionCode}`;
            window.location.href = redirectUrl;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, []);

  if (redirecting) {
    return (
      <section className="mx-auto w-full max-w-3xl px-6 py-16 text-center">
        <CopperIcon d="m4.5 12.75 6 6 9-13.5" />
        <h1 className="mt-6 text-3xl font-semibold text-navy">
          Thank You!
        </h1>
        <p className="mt-3 text-lg text-navy-soft">
          Your responses have been recorded.
        </p>
        <div className="mt-6 rounded-lg bg-copper/10 p-6">
          <p className="text-navy font-medium">
            Redirecting you back to Prolific in {countdown} second{countdown !== 1 ? 's' : ''}...
          </p>
          <div className="mt-4">
            <div className="h-2 bg-navy/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-copper transition-all duration-1000"
                style={{ width: `${((6 - countdown) / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>
        <p className="mt-6 text-sm text-navy-muted">
          If you are not redirected automatically, please close this window and return to Prolific.
        </p>
      </section>
    );
  }

  // Standard thank you message for non-Prolific participants
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16 text-center">
      <CopperIcon d="m4.5 12.75 6 6 9-13.5" />
      <h1 className="mt-6 text-3xl font-semibold text-navy">Thank You!</h1>
      <p className="mt-3 text-navy-soft">
        Your responses have been recorded. We appreciate your help in improving
        our compatibility questionnaire.
      </p>
    </section>
  );
}
