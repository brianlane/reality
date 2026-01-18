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

  useEffect(() => {
    fetch("/api/applicant/matches")
      .then((res) => res.json())
      .then((json) => setMatches(json.matches ?? []));
  }, []);

  return (
    <Card>
      <h2 className="text-lg font-semibold text-navy">Recent Matches</h2>
      {matches.length === 0 ? (
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
