"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { getApplicationStatusConfig } from "@/lib/applicant-status-ui";

type ApplicationData = {
  id: string;
  status: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
};

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

  const config = data ? getApplicationStatusConfig(data.status) : null;

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
              <h2 className="text-lg font-semibold text-navy">
                {config.title}
              </h2>
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
