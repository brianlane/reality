"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";

type MatchDetail = {
  id: string;
  eventName: string;
  partner: {
    firstName: string;
    age: number;
    occupation: string;
  };
  compatibilityScore: number | null;
  outcome: string;
  contactExchanged: boolean;
  notifiedAt: string;
};

function ScoreBar({ score }: { score: number }) {
  const filled = Math.round((score / 100) * 10);
  return (
    <span className="inline-flex gap-0.5 font-mono text-sm">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={i < filled ? "text-copper" : "text-stone-300"}>
          █
        </span>
      ))}
    </span>
  );
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const label = outcome
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const color =
    outcome === "PENDING"
      ? "bg-stone-100 text-stone-600"
      : outcome === "NO_CONNECTION" || outcome === "GHOSTED"
        ? "bg-red-50 text-red-600"
        : "bg-green-50 text-green-700";

  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

export default function ApplicantMatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/applicant/matches/${id}`, { signal: controller.signal })
      .then((res) => {
        if (res.status === 404) {
          setError("Match not found.");
          setIsLoading(false);
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (!json) return;
        if (json.error) {
          setError(json.error.message ?? "Failed to load match.");
        } else {
          setMatch(json);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError("Failed to load match.");
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Link href="/matches" className="text-sm text-navy-soft hover:text-navy">
          ← Back to matches
        </Link>
        <p className="text-sm text-navy-soft">Loading match…</p>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="space-y-4">
        <Link href="/matches" className="text-sm text-navy-soft hover:text-navy">
          ← Back to matches
        </Link>
        <Card>
          <p className="text-sm text-navy-soft">{error ?? "Match not found."}</p>
        </Card>
      </div>
    );
  }

  const score =
    match.compatibilityScore !== null
      ? Math.round(match.compatibilityScore)
      : null;

  return (
    <div className="space-y-6">
      <Link href="/matches" className="text-sm text-navy-soft hover:text-navy">
        ← Back to matches
      </Link>

      <Card className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-navy-soft uppercase tracking-wide mb-1">
              {match.eventName}
            </p>
            <h1 className="text-2xl font-semibold text-navy">
              {match.partner.firstName}
            </h1>
            <p className="text-sm text-navy-soft mt-1">
              {match.partner.age} · {match.partner.occupation}
            </p>
          </div>
          <OutcomeBadge outcome={match.outcome} />
        </div>

        {score !== null ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-navy-soft uppercase tracking-wide">
              Compatibility
            </p>
            <div className="flex items-center gap-3">
              <ScoreBar score={score} />
              <span className="text-lg font-bold text-navy">{score}</span>
              <span className="text-sm text-navy-soft">/ 100</span>
            </div>
          </div>
        ) : null}

        {match.contactExchanged ? (
          <p className="text-sm text-green-700 font-medium">
            ✓ Contact information exchanged
          </p>
        ) : null}
      </Card>
    </div>
  );
}
