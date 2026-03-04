"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";
import type { LocationBreakdownType } from "@/app/api/admin/stats/location-breakdown/route";

type Row = { location: string; count: number };

export default function AdminLocationBreakdown({
  type,
}: {
  type: LocationBreakdownType;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          return;
        }
        const res = await fetch(
          `/api/admin/stats/location-breakdown?type=${type}`,
          { headers, signal: controller.signal },
        );
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load breakdown.");
          return;
        }
        setRows(json.breakdown ?? []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load breakdown.");
        }
      }
    };

    load();
    return () => controller.abort();
  }, [type]);

  return (
    <Card>
      <h2 className="text-lg font-semibold text-navy">By Location</h2>
      {error ? (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      ) : !rows ? (
        <p className="mt-4 text-sm text-navy-soft">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-navy-soft">No data.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map(({ location, count }) => (
            <div key={location} className="flex items-baseline justify-between">
              <span className="text-sm text-navy-soft truncate">{location}</span>
              <span className="ml-3 text-sm font-semibold text-navy tabular-nums">
                {count.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
