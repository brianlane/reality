"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";

type MatchAnalytics = {
  overall: { totalMatches: number };
  byType: Record<string, { count: number }>;
};

export default function AdminMatchesTable() {
  const [data, setData] = useState<MatchAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/analytics/matches", {
      headers: { "x-mock-user-role": "ADMIN" },
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load match analytics.");
          return;
        }
        setData(json);
      })
      .catch(() => setError("Failed to load match analytics."));
  }, []);

  if (error) {
    return <Card>{error}</Card>;
  }

  if (!data) {
    return <Card>Loading match analytics...</Card>;
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-navy">Matches</h2>
      <p className="mt-2 text-sm text-navy-soft">
        Total matches: {data.overall.totalMatches}
      </p>
      <Table className="mt-4">
        <thead>
          <tr className="border-b text-xs uppercase text-slate-400">
            <th className="py-2 text-left">Type</th>
            <th className="py-2 text-left">Count</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(data.byType).map(([type, value]) => (
            <tr key={type} className="border-b text-sm text-navy-soft">
              <td className="py-2">{type}</td>
              <td className="py-2">{value.count}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
