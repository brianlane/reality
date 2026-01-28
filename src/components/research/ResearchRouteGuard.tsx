"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

type ResearchRouteGuardProps = {
  children: React.ReactNode;
};

export default function ResearchRouteGuard({
  children,
}: ResearchRouteGuardProps) {
  const isResearch = useSyncExternalStore(
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

  if (isResearch === null) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-navy-soft">Loading...</p>
        </div>
      </section>
    );
  }

  if (isResearch) {
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
