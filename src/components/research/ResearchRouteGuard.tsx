"use client";

import { useEffect, useState } from "react";
import { useSyncExternalStore } from "react";
import Link from "next/link";

// Application statuses that belong to the research flow
const RESEARCH_STATUSES = new Set([
  "RESEARCH_INVITED",
  "RESEARCH_IN_PROGRESS",
  "RESEARCH_COMPLETED",
]);

type ResearchRouteGuardProps = {
  children: React.ReactNode;
};

export default function ResearchRouteGuard({
  children,
}: ResearchRouteGuardProps) {
  // null = not yet verified with server, true = confirmed research, false = not research
  const [serverVerified, setServerVerified] = useState<boolean | null>(null);

  const localFlag = useSyncExternalStore(
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
      return localStorage.getItem("researchMode") === "true";
    },
    () => null,
  );

  useEffect(() => {
    // Not in research mode locally — no server call needed
    if (localFlag === null || localFlag === false) {
      return;
    }

    // localStorage claims research mode — verify against the server to guard
    // against stale flags from prior sessions on a shared browser
    let cancelled = false;
    // Reset to loading state when entering research mode, but do it async so
    // we don't synchronously set state inside the effect body.
    queueMicrotask(() => {
      if (!cancelled) {
        setServerVerified(null);
      }
    });
    fetch("/api/applicant/application")
      .then(async (res) => {
        if (cancelled) return;

        // This endpoint requires authentication, but research invite users are
        // often unauthenticated. In that case, trust the local research flag
        // and keep them blocked from the standard application flow.
        if (res.status === 401 || res.status === 403) {
          setServerVerified(true);
          return;
        }

        if (!res.ok) {
          // Fail closed for transient server failures while research mode is set.
          setServerVerified(true);
          return;
        }

        const data = await res.json().catch(() => null);
        if (cancelled) return;

        if (RESEARCH_STATUSES.has(data?.status)) {
          setServerVerified(true);
        } else {
          // Stale flag — clear it and let the user through.
          localStorage.removeItem("researchMode");
          setServerVerified(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Network failures should also fail closed while research mode is set.
          setServerVerified(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [localFlag]);

  // Show loading during SSR or while server verification is in flight
  if (localFlag === null || (localFlag === true && serverVerified === null)) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-navy-soft">Loading...</p>
        </div>
      </section>
    );
  }

  if (localFlag === true && serverVerified === true) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-navy">
            No Additional Steps Required
          </h1>
          <p className="mt-3 text-navy-soft">
            Research participants do not need to complete this step. Please
            return to your research questionnaire.
          </p>
          <div className="mt-6">
            <Link
              href="/research/questionnaire"
              className="inline-block rounded-md bg-copper px-6 py-3 text-white hover:bg-copper-dark"
            >
              Back to Questionnaire
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
