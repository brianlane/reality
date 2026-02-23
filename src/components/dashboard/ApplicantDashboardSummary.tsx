"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

type DashboardResponse = {
  application: { id: string; status: string; submittedAt?: string | null };
  stats: {
    eventsAttended: number;
    matchesReceived: number;
    datesCompleted: number;
  };
};

export default function ApplicantDashboardSummary() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/applicant/dashboard", { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load dashboard.");
          return;
        }
        setData(json);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError("Failed to load dashboard.");
        }
      });

    return () => controller.abort();
  }, []);

  if (error) {
    return <Card>{error}</Card>;
  }

  if (!data) {
    return <Card>Loading dashboard...</Card>;
  }

  const status = data.application.status;

  return (
    <>
      {status === "DRAFT" ? (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-amber-900">
                Complete Your Application
              </h2>
              <p className="mt-1 text-sm text-amber-800">
                Your access fee has been processed. Please fill out the
                questionnaire and upload your photos to submit.
              </p>
            </div>
            <Link
              href="/apply/questionnaire"
              className="inline-flex shrink-0 items-center justify-center rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800"
            >
              Continue Application
            </Link>
          </div>
        </Card>
      ) : null}
      {status === "PAYMENT_PENDING" ? (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-amber-900">Payment Required</h2>
              <p className="mt-1 text-sm text-amber-800">
                Please complete your application fee payment to continue.
              </p>
            </div>
            <Link
              href="/apply/payment"
              className="inline-flex shrink-0 items-center justify-center rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800"
            >
              Complete Payment
            </Link>
          </div>
        </Card>
      ) : null}
      <Card>
        <h2 className="text-lg font-semibold text-navy">Overview</h2>
        <p className="mt-2 text-sm text-navy-soft">
          Application status: {status}
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <div className="text-2xl font-semibold">
            {data.stats.eventsAttended}
          </div>
          <div className="text-sm text-navy-soft">Events attended</div>
        </div>
        <div>
          <div className="text-2xl font-semibold">
            {data.stats.matchesReceived}
          </div>
          <div className="text-sm text-navy-soft">Matches received</div>
        </div>
        <div>
          <div className="text-2xl font-semibold">
            {data.stats.datesCompleted}
          </div>
          <div className="text-sm text-navy-soft">Dates completed</div>
        </div>
        </div>
      </Card>
    </>
  );
}
