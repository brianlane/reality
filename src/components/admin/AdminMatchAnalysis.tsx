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

  const scored = data.breakdown
    .filter((item) => item.weight > 0)
    .sort((a, b) => {
      if (b.similarity !== a.similarity) return b.similarity - a.similarity;
      return b.weight - a.weight;
    });

  // Split into tiers for visual grouping
  const violated = scored.filter((item) => item.dealbreakerViolated);
  const compatible = scored.filter(
    (item) => !item.dealbreakerViolated && item.similarity >= 0.75,
  );
  const partial = scored.filter(
    (item) =>
      !item.dealbreakerViolated &&
      item.similarity > 0 &&
      item.similarity < 0.75,
  );
  // High-weight gaps: 0% match on questions the algorithm considers significant
  const significantGaps = scored.filter(
    (item) =>
      !item.dealbreakerViolated && item.similarity === 0 && item.weight >= 0.5,
  );
  const minorDiffs = scored.filter(
    (item) =>
      !item.dealbreakerViolated && item.similarity === 0 && item.weight < 0.5,
  );

  const excludedCount = data.breakdown.filter(
    (item) => item.weight === 0,
  ).length;

  function SectionDivider({
    label,
    color,
    note,
  }: {
    label: string;
    color: string;
    note?: string;
  }) {
    return (
      <tr>
        <td colSpan={5} className={`px-0 pt-5 pb-1`}>
          <div className="flex items-baseline gap-2">
            <span className={`text-xs font-semibold uppercase tracking-wide ${color}`}>
              {label}
            </span>
            {note && (
              <span className="text-xs text-stone-400">{note}</span>
            )}
          </div>
          <div className={`mt-1 h-px ${color.includes("red") ? "bg-red-200" : color.includes("amber") ? "bg-amber-200" : color.includes("green") ? "bg-green-200" : "bg-stone-200"}`} />
        </td>
      </tr>
    );
  }

  function QuestionRow({ item }: { item: BreakdownItem }) {
    return (
      <tr
        className={`border-b ${
          item.dealbreakerViolated
            ? "bg-red-50"
            : item.isDealbreakerQuestion && item.similarity < 1
              ? "bg-amber-50"
              : ""
        }`}
      >
        <td className="py-2 pr-6">
          <p className="max-w-xs text-sm text-navy leading-snug">
            {item.prompt}
          </p>
          {item.dealbreakerViolated ? (
            <span className="text-xs font-medium text-red-600">
              ★ dealbreaker — violated
            </span>
          ) : item.isDealbreakerQuestion && item.similarity < 1 ? (
            <span className="text-xs text-amber-600">
              ★ dealbreaker · near threshold
            </span>
          ) : null}
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
                style={{ width: `${Math.round(item.similarity * 100)}%` }}
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
    );
  }

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
            {violated.length > 0 && (
              <>
                <SectionDivider label="Dealbreakers violated" color="text-red-600" />
                {violated.map((item) => <QuestionRow key={item.questionId} item={item} />)}
              </>
            )}

            {compatible.length > 0 && (
              <>
                <SectionDivider label="Compatible" color="text-green-700" />
                {compatible.map((item) => <QuestionRow key={item.questionId} item={item} />)}
              </>
            )}

            {partial.length > 0 && (
              <>
                <SectionDivider label="Partial match" color="text-amber-700" />
                {partial.map((item) => <QuestionRow key={item.questionId} item={item} />)}
              </>
            )}

            {significantGaps.length > 0 && (
              <>
                <SectionDivider
                  label="Significant gaps"
                  color="text-amber-700"
                  note="— high-weight questions with no overlap · verify if any should be dealbreakers"
                />
                {significantGaps.map((item) => <QuestionRow key={item.questionId} item={item} />)}
              </>
            )}

            {minorDiffs.length > 0 && (
              <>
                <SectionDivider label="Minor differences" color="text-stone-400" />
                {minorDiffs.map((item) => <QuestionRow key={item.questionId} item={item} />)}
              </>
            )}
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
