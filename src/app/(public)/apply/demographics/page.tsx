"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import ApplicationDraftForm from "@/components/forms/ApplicationDraftForm";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ResearchRouteGuard from "@/components/research/ResearchRouteGuard";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getDemographicsRouteDecision } from "@/lib/apply/demographics-routing";

export default function DemographicsPage() {
  const router = useRouter();
  const hasInviteContext = useSyncExternalStore(
    (callback) => {
      if (typeof window === "undefined") {
        return () => undefined;
      }
      window.addEventListener("storage", callback);
      return () => window.removeEventListener("storage", callback);
    },
    () => {
      if (typeof window === "undefined") {
        return null;
      }
      const token = localStorage.getItem("waitlistInviteToken");
      const applicationId = localStorage.getItem("applicationId");
      return !!(token || applicationId);
    },
    () => null,
  );
  const [sessionState, setSessionState] = useState<
    "unknown" | "authenticated" | "unauthenticated"
  >("unknown");
  const [recoveryMessage, setRecoveryMessage] = useState<string | null>(null);

  useEffect(() => {
    if (hasInviteContext === null) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        queueMicrotask(() => {
          if (!cancelled) {
            setSessionState("unauthenticated");
          }
        });
        return;
      }

      let sessionData:
        | Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]
        | null = null;
      try {
        const { data } = await supabase.auth.getSession();
        sessionData = data;
      } catch {
        if (!cancelled) {
          setSessionState("unauthenticated");
        }
        return;
      }

      try {
        if (cancelled) return;
        if (!sessionData?.session) {
          setSessionState("unauthenticated");
          return;
        }
        setSessionState("authenticated");
        setRecoveryMessage(null);

        const dashboardRes = await fetch("/api/applicant/dashboard");
        if (cancelled) return;
        const dashboardJson = await dashboardRes.json().catch(() => null);
        if (cancelled) return;
        const status = dashboardJson?.application?.status as string | undefined;
        const decision = getDemographicsRouteDecision({
          status,
          dashboardStatusCode: dashboardRes.status,
          hasInviteContext,
        });

        if (decision.type === "reset_session_for_invite_recovery") {
          await supabase.auth.signOut();
          if (!cancelled) {
            setSessionState("unauthenticated");
            setRecoveryMessage(
              "Your previous session expired for this application. Please continue with your invite link details.",
            );
          }
          return;
        }

        if (decision.type === "redirect") {
          if (cancelled) return;
          router.replace(decision.href);
        }
      } catch {
        // Errors after session confirmation should not downgrade auth state.
        // Route to dashboard as the safest fallback for authenticated users.
        if (!cancelled) {
          router.replace("/dashboard");
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [router, hasInviteContext]);

  const isLoading =
    hasInviteContext === null ||
    sessionState === "unknown" ||
    sessionState === "authenticated";
  const isAuthorized =
    sessionState === "unauthenticated" && hasInviteContext === true;

  let content: ReactNode;

  if (isLoading) {
    content = (
      <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-navy-soft">Loading...</p>
        </div>
      </section>
    );
  } else if (!isAuthorized) {
    content = (
      <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <h1 className="text-2xl font-semibold text-navy">
            Unauthorized Access
          </h1>
          <p className="mt-4 text-navy-soft">
            You need a valid invitation to access this page. Please check your
            email for an invitation link or return to the homepage.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-block rounded-md bg-copper px-6 py-3 text-white hover:bg-copper-dark"
            >
              Return to Homepage
            </Link>
          </div>
        </div>
      </section>
    );
  } else {
    content = (
      <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-semibold text-navy sm:text-4xl">
          Complete Your Profile
        </h1>
        <p className="mt-2 text-navy-soft">
          Step 1 of 4: Demographics. Complete the form to continue your
          application.
        </p>
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          {recoveryMessage ? (
            <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {recoveryMessage}
            </p>
          ) : null}
          <ApplicationDraftForm />
        </div>
      </section>
    );
  }

  return <ResearchRouteGuard>{content}</ResearchRouteGuard>;
}
