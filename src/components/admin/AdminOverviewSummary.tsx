"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type OverviewResponse = {
  applicants: {
    total: number;
    approved: number;
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

    const loadOverview = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          return;
        }

        const res = await fetch("/api/admin/analytics/overview", {
          headers,
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load overview.");
          return;
        }
        setData(json);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load overview.");
        }
      }
    };

    loadOverview();

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
