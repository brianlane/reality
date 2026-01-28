"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import ApplicationDraftForm from "@/components/forms/ApplicationDraftForm";
import Link from "next/link";
import ResearchRouteGuard from "@/components/research/ResearchRouteGuard";

export default function DemographicsPage() {
  const isAuthorized = useSyncExternalStore(
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

  let content: ReactNode;

  if (isAuthorized === null) {
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
          <ApplicationDraftForm />
        </div>
      </section>
    );
  }

  return <ResearchRouteGuard>{content}</ResearchRouteGuard>;
}
