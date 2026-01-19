"use client";

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
    fetch("/api/applicant/dashboard")
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load dashboard.");
          return;
        }
        setData(json);
      })
      .catch(() => setError("Failed to load dashboard."));
  }, []);

  if (error) {
    return <Card>{error}</Card>;
  }

  if (!data) {
    return <Card>Loading dashboard...</Card>;
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-navy">Overview</h2>
      <p className="mt-2 text-sm text-navy-soft">
        Application status: {data.application.status}
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
  );
}
