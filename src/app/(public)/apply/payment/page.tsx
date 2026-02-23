"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PaymentAction from "@/components/forms/PaymentAction";
import ResearchRouteGuard from "@/components/research/ResearchRouteGuard";
import { APP_STATUS } from "@/lib/application-status";

export default function PaymentPage() {
  const router = useRouter();
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      try {
        const response = await fetch("/api/applicant/dashboard");
        const json = await response.json().catch(() => null);
        if (cancelled) return;

        if (response.status === 401) {
          router.replace("/sign-in?next=/apply/payment");
          return;
        }

        if (!response.ok) {
          router.replace("/dashboard");
          return;
        }

        const appStatus = json?.application?.status as string | undefined;

        // If admin applied skip-payment, status is now DRAFT — send user to questionnaire
        if (appStatus === APP_STATUS.DRAFT) {
          router.replace("/apply/questionnaire");
          return;
        }

        // Only PAYMENT_PENDING users belong on this page
        if (appStatus !== APP_STATUS.PAYMENT_PENDING) {
          router.replace("/dashboard");
          return;
        }

        // User passes: reveal the payment form
        if (!cancelled) {
          setIsCheckingAccess(false);
        }
      } catch {
        if (!cancelled) {
          router.replace("/dashboard");
        }
      }
    };

    void checkAccess();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <ResearchRouteGuard>
      <section className="mx-auto w-full max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold text-navy">Application Fee</h1>
        <p className="mt-2 text-navy-soft">
          Step 2 of 4: Complete your application fee payment to proceed.
        </p>
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          {isCheckingAccess ? (
            <p className="text-sm text-navy-soft">Verifying access...</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="font-medium text-navy">
                    Application Processing Fee
                  </p>
                  <p className="mt-1 text-sm text-navy-soft">
                    One-time fee to process your application
                  </p>
                </div>
                <p className="text-2xl font-semibold text-navy">$199.00</p>
              </div>

              <div className="space-y-2 text-sm text-navy-soft">
                <p className="font-medium text-navy">What&apos;s included:</p>
                <ul className="list-inside list-disc space-y-1">
                  <li>Full application review by our team</li>
                  <li>Background check and identity verification</li>
                  <li>Personalized compatibility assessment</li>
                  <li>Access to matchmaking events upon approval</li>
                </ul>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <PaymentAction />
              </div>

              <p className="text-center text-xs text-slate-400">
                Secure payment processed by Stripe. Your payment information is
                never stored on our servers.
              </p>
            </div>
          )}
        </div>
      </section>
    </ResearchRouteGuard>
  );
}
