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
        <h1 className="text-3xl font-semibold text-navy">Payment</h1>
        <p className="mt-2 text-navy-soft">
          Step 2 of 4: Application fee checkout (mocked in MVP).
        </p>
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-navy-soft">
          {isCheckingAccess ? (
            <p>Verifying access...</p>
          ) : (
            <>
              <p>Payment integration is stubbed for MVP testing.</p>
              <div className="mt-4">
                <PaymentAction />
              </div>
            </>
          )}
        </div>
      </section>
    </ResearchRouteGuard>
  );
}
