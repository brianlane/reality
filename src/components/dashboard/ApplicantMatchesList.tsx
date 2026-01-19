"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

type MatchItem = {
  id: string;
  eventName: string;
  partner: { firstName: string };
  outcome: string;
};

export default function ApplicantMatchesList() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/applicant/matches", { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => setMatches(json.matches ?? []))
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError("Failed to load matches.");
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <Card>
      <h2 className="text-lg font-semibold text-navy">Recent Matches</h2>
      {error ? (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      ) : matches.length === 0 ? (
        <p className="mt-2 text-sm text-navy-soft">No matches yet.</p>
      ) : (
        <ul className="mt-4 space-y-2 text-sm text-navy-soft">
          {matches.map((match) => (
            <li key={match.id} className="flex items-center justify-between">
              <span>
                {match.partner.firstName} · {match.eventName}
              </span>
              <span className="text-navy-soft">{match.outcome}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
