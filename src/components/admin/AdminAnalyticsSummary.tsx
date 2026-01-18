"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

type AnalyticsOverview = {
  applicants: { total: number; approvalRate: number };
  events: { total: number; upcoming: number };
  revenue: { total: number };
};

export default function AdminAnalyticsSummary() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics/overview", {
      headers: { "x-mock-user-role": "ADMIN" },
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load analytics.");
          return;
        }
        setData(json);
      })
      .catch(() => setError("Failed to load analytics."));
  }, []);

  if (error) {
    return <Card>{error}</Card>;
  }

  if (!data) {
    return <Card>Loading analytics...</Card>;
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-navy">
        Analytics Snapshot
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm text-navy-soft">
        <div>
          <div className="text-xl font-semibold">{data.applicants.total}</div>
          <div>Applicants</div>
        </div>
        <div>
          <div className="text-xl font-semibold">{data.events.total}</div>
          <div>Events</div>
        </div>
        <div>
          <div className="text-xl font-semibold">
            ${(data.revenue.total / 100).toFixed(2)}
          </div>
          <div>Revenue</div>
        </div>
      </div>
    </Card>
  );
}
