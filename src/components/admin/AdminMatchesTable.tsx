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

  useEffect(() => {
    fetch("/api/admin/analytics/matches", { headers: { "x-mock-user-role": "ADMIN" } })
      .then((res) => res.json())
      .then((json) => setData(json));
  }, []);

  if (!data) {
    return <Card>Loading match analytics...</Card>;
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">Matches</h2>
      <p className="mt-2 text-sm text-slate-500">
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
            <tr key={type} className="border-b text-sm text-slate-600">
              <td className="py-2">{type}</td>
              <td className="py-2">{value.count}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
