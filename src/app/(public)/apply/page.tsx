import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import Stage1QualificationForm from "@/components/forms/Stage1QualificationForm";
import ExistingApplicationStatus from "@/components/apply/ExistingApplicationStatus";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Apply | Reality Matchmaking",
  description:
    "Apply for Reality Matchmaking — selective matchmaking events for professionals. Background-checked, personality-first dating with curated matches.",
  openGraph: {
    title: "Apply | Reality Matchmaking",
    description:
      "Apply for Reality Matchmaking — selective matchmaking events for professionals. Background-checked, personality-first dating with curated matches.",
    url: "https://www.realitymatchmaking.com/apply",
    siteName: "Reality Matchmaking",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Reality Matchmaking",
      },
    ],
  },
};

export default async function ApplyPage() {
  // Check if user is authenticated and has an existing application
  const auth = await getAuthUser();
  let existingApplication = null;

  if (auth?.email) {
    const user = await db.user.findFirst({
      where: {
        email: { equals: auth.email, mode: "insensitive" },
        deletedAt: null,
      },
    });

    if (user) {
      const applicant = await db.applicant.findFirst({
        where: { userId: user.id, deletedAt: null },
      });
      if (applicant) {
        existingApplication = applicant;
      }
    }
  }

  // If user has an existing application, handle based on status
  if (existingApplication) {
    const softRejectedApplication =
      existingApplication as typeof existingApplication & {
        softRejectedAt?: Date | null;
        softRejectedFromStatus?: string | null;
      };
    const effectiveStatus = softRejectedApplication.softRejectedAt
      ? (softRejectedApplication.softRejectedFromStatus ??
        existingApplication.applicationStatus)
      : existingApplication.applicationStatus;
    // If on waitlist, redirect to waitlist confirmation page
    if (
      effectiveStatus === "WAITLIST" &&
      !softRejectedApplication.softRejectedAt
    ) {
      redirect(`/apply/waitlist?id=${existingApplication.id}`);
    }

    // For any other status, show the status page
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <ExistingApplicationStatus application={existingApplication} />
      </section>
    );
  }

  return (
    <article className="overflow-x-hidden">
      {/* Hero */}
      <section>
        <div className="mx-auto max-w-3xl px-6 pt-20 pb-8 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-copper">
            Apply for Membership
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-navy sm:text-5xl">
            Dating apps stopped making sense.
            <br />
            <span className="text-copper">Reality is waiting for you.</span>
          </h1>
        </div>
      </section>

      {/* Body copy + Form */}
      <section className="mx-auto max-w-3xl px-6 pt-8 pb-16">
        <div className="mb-10 space-y-4 text-base text-navy-soft leading-relaxed">
          <p>Every member is background checked and manually reviewed.</p>
          <p>
            When we&apos;ve curated the right group, you&apos;ll receive a
            personal invitation.
          </p>
          <p>
            Events are designed for individuals who are serious about finding a
            life partner — <em>not another match.</em>
          </p>
          <p>
            Learn more about our{" "}
            <Link
              href="/purpose"
              className="underline hover:text-copper transition-colors"
            >
              purpose
            </Link>
            .
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <Stage1QualificationForm />
        </div>
      </section>
    </article>
  );
}
