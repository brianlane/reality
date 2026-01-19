"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

type OverviewResponse = {
  applicants: {
    total: number;
    approved: number;
    rejected: number;
    waitlist: number;
  };
  events: { total: number; upcoming: number; completed: number };
  revenue: { total: number };
};

export default function AdminOverviewSummary() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/admin/analytics/overview", {
      headers: { "x-mock-user-role": "ADMIN" },
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load overview.");
          return;
        }
        setData(json);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError("Failed to load overview.");
        }
      });

    return () => controller.abort();
  }, []);

  if (error) {
    return <Card>{error}</Card>;
  }

  if (!data) {
    return <Card>Loading overview...</Card>;
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-navy">Business Overview</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <div className="text-2xl font-semibold">{data.applicants.total}</div>
          <div className="text-sm text-navy-soft">Applicants</div>
        </div>
        <div>
          <div className="text-2xl font-semibold">{data.events.total}</div>
          <div className="text-sm text-navy-soft">Events</div>
        </div>
        <div>
          <div className="text-2xl font-semibold">
            ${(data.revenue.total / 100).toFixed(2)}
          </div>
          <div className="text-sm text-navy-soft">Revenue</div>
        </div>
      </div>
    </Card>
  );
}
