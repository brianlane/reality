"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type EventStats = {
  invited: number;
  men: number;
  women: number;
  existingMatches: number;
};

type PreviewMatch = {
  applicantId: string;
  partnerId: string;
  score: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const filled = Math.round((score / 100) * 10);
  return (
    <span className="inline-flex gap-0.5 font-mono text-xs">
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className={i < filled ? "text-copper" : "text-stone-300"}>
          █
        </span>
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

type AdminEventMatchingPanelProps = {
  eventId: string;
};

export default function AdminEventMatchingPanel({
  eventId,
}: AdminEventMatchingPanelProps) {
  // ── State ────────────────────────────────────────────────────────────────
  const [minScore, setMinScore] = useState(65);
  const [maxPerApplicant, setMaxPerApplicant] = useState(5);

  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  const [preview, setPreview] = useState<PreviewMatch[] | null>(null);
  const [previewAvgScore, setPreviewAvgScore] = useState<number | null>(null);

  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Load event stats on mount ────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setError("Please sign in again.");
        return;
      }
      const res = await fetch(`/api/admin/events/${eventId}`, { headers });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to load event stats.");
        return;
      }

      const { stats, invitations, matches } = json;

      setEventStats({
        invited: stats.invitationsSent,
        men: stats.genderBalance?.male ?? 0,
        women: stats.genderBalance?.female ?? 0,
        existingMatches: matches?.length ?? 0,
      });

      // Build name map from invitations
      const map: Record<string, string> = {};
      for (const inv of invitations ?? []) {
        map[inv.applicantId] = inv.applicantName;
      }
      setNameMap(map);
    } catch {
      setError("Failed to load event stats.");
    } finally {
      setIsLoadingStats(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // ── Preview handler ──────────────────────────────────────────────────────
  async function handlePreview() {
    setIsPreviewing(true);
    setError(null);
    setSuccess(null);
    setPreview(null);
    setPreviewAvgScore(null);

    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setError("Please sign in again.");
        return;
      }

      const res = await fetch(`/api/admin/events/${eventId}/generate-matches`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          minScore,
          maxPerApplicant,
          createMatches: false,
        }),
      });
      const json = await res.json();

      if (!res.ok || json?.error) {
        setError(json?.error?.message ?? "Preview failed.");
        return;
      }

      const recs: PreviewMatch[] = json.recommendations ?? [];
      // Deduplicate bidirectional pairs for display
      const seen = new Set<string>();
      const unique: PreviewMatch[] = [];
      for (const r of recs) {
        const key =
          r.applicantId < r.partnerId
            ? `${r.applicantId}:${r.partnerId}`
            : `${r.partnerId}:${r.applicantId}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push(r);
        }
      }
      // Sort descending by score
      unique.sort((a, b) => b.score - a.score);

      setPreview(unique);
      setPreviewAvgScore(
        unique.length > 0
          ? Math.round(unique.reduce((s, r) => s + r.score, 0) / unique.length)
          : 0,
      );
    } catch {
      setError("Preview failed.");
    } finally {
      setIsPreviewing(false);
    }
  }

  // ── Create handler ───────────────────────────────────────────────────────
  async function handleCreate() {
    if (!preview || preview.length === 0) return;
    setIsCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setError("Please sign in again.");
        return;
      }

      const res = await fetch(`/api/admin/events/${eventId}/generate-matches`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          minScore,
          maxPerApplicant,
          createMatches: true,
        }),
      });
      const json = await res.json();

      if (!res.ok || json?.error) {
        setError(json?.error?.message ?? "Failed to create matches.");
        return;
      }

      setSuccess(
        `Created ${json.matchesCreated} matches (avg score: ${json.avgScore}).`,
      );
      setPreview(null);
      setPreviewAvgScore(null);
      // Refresh stats to update existing match count
      await loadStats();
    } catch {
      setError("Failed to create matches.");
    } finally {
      setIsCreating(false);
    }
  }

  // ── Resolve display name ─────────────────────────────────────────────────
  function resolveName(id: string): string {
    const full = nameMap[id];
    if (!full) return id.slice(0, 8) + "…";
    const parts = full.trim().split(" ");
    const first = parts[0] ?? "";
    const lastInitial = parts[parts.length - 1]?.[0] ?? "";
    return `${first} ${lastInitial}.`;
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Card className="space-y-4">
      <h2 className="text-lg font-semibold text-navy">Match Generation</h2>

      {/* Stats */}
      {isLoadingStats ? (
        <p className="text-sm text-stone-500">Loading event stats…</p>
      ) : eventStats ? (
        <div className="rounded-md bg-stone-50 px-4 py-3 text-sm text-stone-700">
          <span className="font-medium">{eventStats.invited} invited</span>
          {" · "}
          <span>{eventStats.men} men</span>
          {" · "}
          <span>{eventStats.women} women</span>
          {" · "}
          <span>{eventStats.existingMatches} existing matches</span>
        </div>
      ) : null}

      {/* Config */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-navy-soft">
            Min Compatibility Score (0–100)
          </label>
          <Input
            type="number"
            min={0}
            max={100}
            value={minScore}
            onChange={(e) => {
              setMinScore(Number(e.target.value));
              setPreview(null);
              setPreviewAvgScore(null);
            }}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-navy-soft">
            Max Matches per Person (1–20)
          </label>
          <Input
            type="number"
            min={1}
            max={20}
            value={maxPerApplicant}
            onChange={(e) => {
              setMaxPerApplicant(Number(e.target.value));
              setPreview(null);
              setPreviewAvgScore(null);
            }}
          />
        </div>
      </div>

      {/* Feedback */}
      {error ? (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      {/* Preview button */}
      <Button
        type="button"
        onClick={handlePreview}
        disabled={isPreviewing || isCreating}
        variant="outline"
        className="bg-copper/10 hover:bg-copper/20 text-copper border-copper"
      >
        {isPreviewing ? "Previewing…" : "Preview Matches"}
      </Button>

      {/* Preview results */}
      {preview !== null ? (
        <div className="space-y-3">
          <div className="border-t pt-3 text-sm font-medium text-stone-600">
            {preview.length === 0 ? (
              "No matches found at this threshold — try lowering the min score."
            ) : (
              <>
                Preview: {preview.length} potential match
                {preview.length !== 1 ? "es" : ""}, avg score:{" "}
                <span className="font-semibold text-navy">
                  {previewAvgScore}
                </span>
              </>
            )}
          </div>

          {preview.length > 0 ? (
            <>
              <div className="max-h-80 overflow-y-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-stone-50">
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left font-semibold text-stone-600">
                        Person A
                      </th>
                      <th className="px-1 py-2 text-center text-stone-400">
                        ↔
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-stone-600">
                        Person B
                      </th>
                      <th className="px-3 py-2 text-right font-semibold text-stone-600">
                        Score
                      </th>
                      <th className="px-3 py-2 text-left font-semibold text-stone-600 hidden sm:table-cell">
                        Fit
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {preview.map((match, i) => (
                      <tr key={i} className="hover:bg-stone-50">
                        <td className="px-3 py-2 font-medium text-navy">
                          {resolveName(match.applicantId)}
                        </td>
                        <td className="px-1 py-2 text-center text-stone-400">
                          ↔
                        </td>
                        <td className="px-3 py-2 font-medium text-navy">
                          {resolveName(match.partnerId)}
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-copper">
                          {match.score}
                        </td>
                        <td className="px-3 py-2 hidden sm:table-cell">
                          <ScoreBar score={match.score} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {eventStats && eventStats.existingMatches > 0 ? (
                <p className="text-xs text-amber-600">
                  ⚠ This event already has {eventStats.existingMatches} match
                  {eventStats.existingMatches !== 1 ? "es" : ""}. New matches
                  will be added alongside them (exact duplicates are skipped).
                </p>
              ) : null}

              <Button
                type="button"
                onClick={handleCreate}
                disabled={isCreating || isPreviewing}
                className="bg-copper hover:bg-copper/90"
              >
                {isCreating
                  ? "Creating…"
                  : `Create ${preview.length} Match${preview.length !== 1 ? "es" : ""}`}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
