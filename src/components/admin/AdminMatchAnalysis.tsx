"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type BreakdownItem = {
  questionId: string;
  prompt: string;
  similarity: number;
  weight: number;
  weightedScore: number;
  questionType: string | null;
  isDealbreakerQuestion: boolean;
  dealbreakerViolated: boolean;
  answerA: unknown;
  answerB: unknown;
};

type AnalysisData = {
  score: number;
  dealbreakersViolated: number;
  questionsScored: number;
  applicantName: string;
  partnerName: string;
  breakdown: BreakdownItem[];
};

function formatValue(val: unknown, questionType?: string | null): string {
  if (val === null || val === undefined) return "—";

  // AGE_RANGE is stored as { min, max } — render as "18–26" not as a key-value dump
  if (
    questionType === "AGE_RANGE" &&
    typeof val === "object" &&
    !Array.isArray(val)
  ) {
    const range = val as { min?: number; max?: number };
    if (range.min !== undefined && range.max !== undefined) {
      return `${range.min}–${range.max}`;
    }
  }

  if (Array.isArray(val)) {
    if (val.length === 0) return "—";
    return (val as string[]).join(", ");
  }
  if (typeof val === "object") {
    // POINT_ALLOCATION: { item: points } — sort by points descending
    return (
      Object.entries(val as Record<string, number>)
        .filter(([, v]) => v > 0)
        .sort(([, a], [, b]) => b - a)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ") || "—"
    );
  }
  return String(val);
}

function simBarColor(sim: number): string {
  if (sim >= 0.75) return "bg-green-500";
  if (sim >= 0.5) return "bg-amber-400";
  return "bg-red-500";
}

function simTextColor(sim: number): string {
  if (sim >= 0.75) return "text-green-700";
  if (sim >= 0.5) return "text-amber-700";
  return "text-red-600";
}

type AdminMatchAnalysisProps = {
  matchId: string;
};

export default function AdminMatchAnalysis({
  matchId,
}: AdminMatchAnalysisProps) {
  const [data, setData] = useState<AnalysisData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          setIsLoading(false);
          return;
        }
        const res = await fetch(`/api/admin/matches/${matchId}/analysis`, {
          headers,
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError(json?.error?.message ?? "Failed to load analysis.");
          setIsLoading(false);
          return;
        }
        setData(json as AnalysisData);
        setIsLoading(false);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load analysis.");
          setIsLoading(false);
        }
      }
    };

    load();
    return () => controller.abort();
  }, [matchId]);

  if (isLoading) {
    return (
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-navy">
          Compatibility Analysis
        </h2>
        <p className="text-sm text-navy-soft">Loading analysis...</p>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-navy">
          Compatibility Analysis
        </h2>
        <p className="text-sm text-red-600">{error ?? "No data available."}</p>
      </Card>
    );
  }

  // Scored questions sorted by impact (best-matching areas first)
  const scored = data.breakdown
    .filter((item) => item.weight > 0)
    .sort((a, b) => {
      const impactA = a.weight * (1 - a.similarity);
      const impactB = b.weight * (1 - b.similarity);
      return impactA - impactB;
    });

  const excludedCount = data.breakdown.filter(
    (item) => item.weight === 0,
  ).length;

  return (
    <Card className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <h2 className="text-lg font-semibold text-navy">
          Compatibility Analysis
        </h2>
        <div className="text-right">
          <div className="text-4xl font-bold text-navy">
            {data.score}
            <span className="text-xl font-normal text-navy-soft"> / 100</span>
          </div>
          <div className="mt-0.5 text-xs text-navy-soft">
            {data.questionsScored} questions scored
          </div>
          {data.dealbreakersViolated > 0 ? (
            <div className="mt-0.5 text-xs font-medium text-red-600">
              {data.dealbreakersViolated} dealbreaker
              {data.dealbreakersViolated > 1 ? "s" : ""} violated
            </div>
          ) : (
            <div className="mt-0.5 text-xs text-green-700">
              No dealbreakers violated
            </div>
          )}
        </div>
      </div>

      {/* Breakdown table */}
      <div className="overflow-x-auto">
        <Table>
          <thead>
            <tr className="border-b text-xs uppercase text-slate-400">
              <th className="py-2 pr-6 text-left">Question</th>
              <th className="py-2 pr-4 text-left">{data.applicantName}</th>
              <th className="py-2 pr-6 text-left">{data.partnerName}</th>
              <th className="py-2 pr-4 text-left">Match</th>
              <th className="py-2 text-left">Weight</th>
            </tr>
          </thead>
          <tbody>
            {scored.map((item) => (
              <tr
                key={item.questionId}
                className={`border-b ${item.dealbreakerViolated ? "bg-red-50" : ""}`}
              >
                <td className="py-2 pr-6">
                  <p className="max-w-xs text-sm text-navy leading-snug">
                    {item.prompt}
                  </p>
                  {item.isDealbreakerQuestion && (
                    <span className="text-xs text-amber-600">
                      ★ dealbreaker
                    </span>
                  )}
                  {item.dealbreakerViolated && (
                    <span className="ml-1 text-xs font-medium text-red-600">
                      — violated
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4 max-w-[140px]">
                  <span className="block truncate text-sm text-navy-soft">
                    {formatValue(item.answerA, item.questionType)}
                  </span>
                </td>
                <td className="py-2 pr-6 max-w-[140px]">
                  <span className="block truncate text-sm text-navy-soft">
                    {formatValue(item.answerB, item.questionType)}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${simBarColor(item.similarity)}`}
                        style={{
                          width: `${Math.round(item.similarity * 100)}%`,
                        }}
                      />
                    </div>
                    <span
                      className={`text-xs font-medium tabular-nums ${simTextColor(item.similarity)}`}
                    >
                      {Math.round(item.similarity * 100)}%
                    </span>
                  </div>
                </td>
                <td className="py-2 text-xs text-navy-soft tabular-nums">
                  {item.weight.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {excludedCount > 0 && (
        <p className="text-xs text-slate-400">
          {excludedCount} question{excludedCount !== 1 ? "s" : ""} excluded from
          scoring (open-ended text responses)
        </p>
      )}
    </Card>
  );
}
