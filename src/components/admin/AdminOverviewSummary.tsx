"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

type OverviewResponse = {
  applicants: { total: number; approved: number; rejected: number; waitlist: number };
  events: { total: number; upcoming: number; completed: number };
  revenue: { total: number };
};

export default function AdminOverviewSummary() {
  const [data, setData] = useState<OverviewResponse | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics/overview", {
      headers: { "x-mock-user-role": "ADMIN" },
    })
      .then((res) => res.json())
      .then((json) => setData(json));
  }, []);

  if (!data) {
    return <Card>Loading overview...</Card>;
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">Business Overview</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <div className="text-2xl font-semibold">{data.applicants.total}</div>
          <div className="text-sm text-slate-500">Applicants</div>
        </div>
        <div>
          <div className="text-2xl font-semibold">{data.events.total}</div>
          <div className="text-sm text-slate-500">Events</div>
        </div>
        <div>
          <div className="text-2xl font-semibold">${(data.revenue.total / 100).toFixed(2)}</div>
          <div className="text-sm text-slate-500">Revenue</div>
        </div>
      </div>
    </Card>
  );
}
