"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";

type ApplicationData = {
  id: string;
  status: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
};

type StatusConfig = {
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
  badge: string;
  badgeClass: string;
};

function getStatusConfig(status: string): StatusConfig {
  switch (status) {
    case "DRAFT":
      return {
        title: "Complete Your Application",
        description:
          "Your access fee has been processed. Please complete the compatibility questionnaire and upload your photos to finish submitting your application.",
        ctaLabel: "Continue Questionnaire",
        ctaHref: "/apply/questionnaire",
        badge: "In Progress",
        badgeClass: "bg-amber-100 text-amber-800",
      };
    case "PAYMENT_PENDING":
      return {
        title: "Payment Required",
        description:
          "Please complete your application fee payment to unlock the questionnaire.",
        ctaLabel: "Complete Payment",
        ctaHref: "/apply/payment",
        badge: "Payment Pending",
        badgeClass: "bg-amber-100 text-amber-800",
      };
    case "SUBMITTED":
      return {
        title: "Application Submitted",
        description:
          "Your application is under review. Our team will be in touch soon.",
        badge: "Submitted",
        badgeClass: "bg-blue-100 text-blue-800",
      };
    case "SCREENING_IN_PROGRESS":
      return {
        title: "Under Review",
        description:
          "Your application is currently being reviewed by our team.",
        badge: "Under Review",
        badgeClass: "bg-blue-100 text-blue-800",
      };
    case "APPROVED":
      return {
        title: "Application Approved",
        description:
          "Congratulations! Your application has been approved. Welcome to Reality Matchmaking.",
        badge: "Approved",
        badgeClass: "bg-green-100 text-green-800",
      };
    case "REJECTED":
      return {
        title: "Application Not Approved",
        description:
          "Unfortunately, your application was not approved at this time. Please contact us if you have questions.",
        badge: "Not Approved",
        badgeClass: "bg-red-100 text-red-800",
      };
    case "WAITLIST":
      return {
        title: "On the Waitlist",
        description:
          "You're on our waitlist. We'll reach out when a spot opens up.",
        badge: "Waitlisted",
        badgeClass: "bg-slate-100 text-slate-700",
      };
    case "WAITLIST_INVITED":
      return {
        title: "Invited Off Waitlist",
        description:
          "You've been invited to continue your application. Check your email for next steps.",
        badge: "Invited",
        badgeClass: "bg-green-100 text-green-800",
      };
    default:
      return {
        title: "Application",
        description: "Track your application status and next steps.",
        badge: status,
        badgeClass: "bg-slate-100 text-slate-700",
      };
  }
}

export default function ApplicantApplicationPage() {
  const [data, setData] = useState<ApplicationData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/applicant/dashboard", { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load application status.");
          return;
        }
        setData(json.application as ApplicationData);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError("Failed to load application status.");
        }
      });

    return () => controller.abort();
  }, []);

  const config = data ? getStatusConfig(data.status) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Application</h1>
        <p className="mt-1 text-sm text-navy-soft">
          Track your application status and next steps.
        </p>
      </div>

      {error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : !data ? (
        <Card>
          <p className="text-sm text-navy-soft">Loading...</p>
        </Card>
      ) : config ? (
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-navy">{config.title}</h2>
              <span
                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${config.badgeClass}`}
              >
                {config.badge}
              </span>
            </div>
          </div>
          <p className="mt-4 text-sm text-navy-soft">{config.description}</p>
          {config.ctaLabel && config.ctaHref ? (
            <div className="mt-6">
              <Link
                href={config.ctaHref}
                className="inline-flex items-center justify-center rounded-md bg-navy px-4 py-2 text-sm font-medium text-white transition hover:bg-copper"
              >
                {config.ctaLabel}
              </Link>
            </div>
          ) : null}
          {data.submittedAt ? (
            <p className="mt-4 text-xs text-navy-soft">
              Submitted on{" "}
              {new Date(data.submittedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
