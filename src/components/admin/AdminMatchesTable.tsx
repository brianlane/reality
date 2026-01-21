"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type MatchItem = {
  id: string;
  event: { id: string; name: string };
  applicant: { id: string; name: string };
  partner: { id: string; name: string };
  type: string;
  outcome: string;
};

export default function AdminMatchesTable() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    const controller = new AbortController();

    const loadMatches = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          return;
        }

        const res = await fetch(`/api/admin/matches?page=${page}`, {
          headers,
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load matches.");
          return;
        }
        setMatches(json.matches ?? []);
        setPages(json.pagination?.pages ?? 1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load matches.");
        }
      }
    };

    loadMatches();

    return () => controller.abort();
  }, [page]);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy">Matches</h2>
        <Link
          href="/admin/matches/new"
          className="text-xs font-semibold text-copper hover:underline"
        >
          New Match
        </Link>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      ) : (
        <Table className="mt-4">
          <thead>
            <tr className="border-b text-xs uppercase text-slate-400">
              <th className="py-2 text-left">Event</th>
              <th className="py-2 text-left">Applicant</th>
              <th className="py-2 text-left">Partner</th>
              <th className="py-2 text-left">Type</th>
              <th className="py-2 text-left">Outcome</th>
              <th className="py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => (
              <tr key={match.id} className="border-b text-sm text-navy-soft">
                <td className="py-2">{match.event?.name ?? "N/A"}</td>
                <td className="py-2">{match.applicant?.name ?? "N/A"}</td>
                <td className="py-2">{match.partner?.name ?? "N/A"}</td>
                <td className="py-2">{match.type}</td>
                <td className="py-2">{match.outcome}</td>
                <td className="py-2">
                  <Link
                    href={`/admin/matches/${match.id}`}
                    className="text-xs font-medium text-copper hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <div className="mt-4 flex items-center justify-between text-sm text-navy-soft">
        <span>
          Page {page} of {pages}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
          >
            Prev
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPage((prev) => Math.min(pages, prev + 1))}
            disabled={page >= pages}
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}
