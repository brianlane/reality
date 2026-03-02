"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";
import LocationFilter from "@/components/admin/LocationFilter";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type EventStats = {
  invited: number;
  men: number;
  women: number;
  existingMatches: number;
};

type MatchRecord = {
  id: string;
  applicantId: string;
  applicantName: string;
  partnerId: string;
  partnerName: string;
  compatibilityScore: number | null;
  notifiedAt: string | null;
};

type PreviewMatch = {
  applicantId: string;
  partnerId: string;
  score: number;
};

type CohortPerson = { id: string; name: string };

type CohortPairScore = {
  manId: string;
  manName: string;
  womanId: string;
  womanName: string;
  score: number;
  dealbreakersViolated: string[];
};

type CohortResult = {
  valid: boolean;
  minScore: number;
  men: CohortPerson[];
  women: CohortPerson[];
  matrix: CohortPairScore[];
  belowThreshold: CohortPairScore[];
  stats: {
    totalPairs: number;
    passingPairs: number;
    failingPairs: number;
    lowestScore: number;
    highestScore: number;
    avgScore: number;
  };
};

type MatchMode = "top_n" | "all_pairs";

type PreviewMatrixData = {
  men: CohortPerson[];
  women: CohortPerson[];
  allPairScores: Array<{
    manId: string;
    womanId: string;
    score: number;
    dealbreakersViolated: string[];
  }>;
  truncated: boolean;
  totalMen: number;
  totalWomen: number;
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

const INVITE_STATUS_LABEL: Record<string, string> = {
  ATTENDED: "Attended",
  ACCEPTED: "Accepted",
  PENDING: "Invited",
  DECLINED: "Declined",
  NO_SHOW: "No show",
};

const INVITE_STATUS_COLOR: Record<string, string> = {
  ATTENDED: "text-green-700",
  ACCEPTED: "text-blue-700",
  PENDING: "text-amber-600",
  DECLINED: "text-red-600",
  NO_SHOW: "text-stone-400",
};

function InviteStatusBadge({ status }: { status: string | undefined }) {
  if (!status) {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
        Not invited
      </span>
    );
  }
  return (
    <span
      className={`text-xs font-medium ${INVITE_STATUS_COLOR[status] ?? "text-stone-500"}`}
    >
      {INVITE_STATUS_LABEL[status] ?? status}
    </span>
  );
}

function scoreColor(score: number, threshold: number): string {
  if (score >= threshold) return "bg-green-100 text-green-800";
  if (score >= threshold - 5) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

function abbrev(fullName: string): string {
  const parts = fullName.trim().split(" ");
  const first = parts[0] ?? "";
  const lastInitial = parts[parts.length - 1]?.[0] ?? "";
  return lastInitial ? `${first} ${lastInitial}.` : first;
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
  const [minScore, setMinScore] = useState(60);
  const [maxPerApplicant, setMaxPerApplicant] = useState(5);
  const [maxPerGender, setMaxPerGender] = useState(15);
  const [matchMode, setMatchMode] = useState<MatchMode>("all_pairs");
  const [locationFilter, setLocationFilter] = useState("");

  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [existingMatchList, setExistingMatchList] = useState<MatchRecord[]>([]);
  const [invitationMap, setInvitationMap] = useState<Record<string, string>>(
    {},
  );
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  const [preview, setPreview] = useState<PreviewMatch[] | null>(null);
  const [previewAvgScore, setPreviewAvgScore] = useState<number | null>(null);
  const [previewMatrix, setPreviewMatrix] = useState<PreviewMatrixData | null>(
    null,
  );
  const [distinctPreview, setDistinctPreview] = useState<PreviewMatch[] | null>(
    null,
  );

  const [cohortResult, setCohortResult] = useState<CohortResult | null>(null);
  const [isValidatingCohort, setIsValidatingCohort] = useState(false);

  const [scoringProgress, setScoringProgress] = useState<{
    scored: number;
    totalPairs: number;
    pct: number;
    elapsedMs: number;
  } | null>(null);

  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [isInvitingAll, setIsInvitingAll] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ── Derive unique individuals across all matches ─────────────────────────
  const matchedIndividuals = useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{ id: string; name: string }> = [];
    for (const match of existingMatchList) {
      if (!seen.has(match.applicantId)) {
        seen.add(match.applicantId);
        result.push({ id: match.applicantId, name: match.applicantName });
      }
      if (!seen.has(match.partnerId)) {
        seen.add(match.partnerId);
        result.push({ id: match.partnerId, name: match.partnerName });
      }
    }
    // Uninvited first, then alphabetical within each group
    return result.sort((a, b) => {
      const aInvited = !!invitationMap[a.id];
      const bInvited = !!invitationMap[b.id];
      if (!aInvited && bInvited) return -1;
      if (aInvited && !bInvited) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [existingMatchList, invitationMap]);

  const uninvitedIndividuals = useMemo(
    () => matchedIndividuals.filter((p) => !invitationMap[p.id]),
    [matchedIndividuals, invitationMap],
  );

  // ── Load event stats ─────────────────────────────────────────────────────
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

      setExistingMatchList(matches ?? []);

      const invMap: Record<string, string> = {};
      const nMap: Record<string, string> = {};
      for (const inv of invitations ?? []) {
        invMap[inv.applicantId] = inv.status;
        nMap[inv.applicantId] = inv.applicantName;
      }
      setInvitationMap(invMap);
      setNameMap(nMap);
    } catch {
      setError("Failed to load event stats.");
    } finally {
      setIsLoadingStats(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // ── Shared invite helper ─────────────────────────────────────────────────
  async function sendInvite(applicantIds: string[]): Promise<boolean> {
    const headers = await getAuthHeaders();
    if (!headers) {
      setError("Please sign in again.");
      return false;
    }
    const res = await fetch(`/api/admin/events/${eventId}/invite`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ applicantIds }),
    });
    const json = await res.json();
    if (!res.ok || json?.error) {
      setError(json?.error?.message ?? "Failed to send invitation.");
      return false;
    }
    return true;
  }

  // ── Invite / Resend single person ────────────────────────────────────────
  async function handleInvite(applicantId: string) {
    setInvitingId(applicantId);
    setError(null);
    setSuccess(null);
    try {
      const ok = await sendInvite([applicantId]);
      if (ok) {
        const isResend = !!invitationMap[applicantId];
        setSuccess(isResend ? "Invitation resent." : "Invitation sent.");
        await loadStats();
      }
    } catch {
      setError("Failed to send invitation.");
    } finally {
      setInvitingId(null);
    }
  }

  // ── Invite all uninvited matched individuals ─────────────────────────────
  async function handleInviteAll() {
    if (uninvitedIndividuals.length === 0) return;
    setIsInvitingAll(true);
    setError(null);
    setSuccess(null);
    try {
      const ids = uninvitedIndividuals.map((p) => p.id);
      const ok = await sendInvite(ids);
      if (ok) {
        setSuccess(
          `Sent ${ids.length} invitation${ids.length !== 1 ? "s" : ""}.`,
        );
        await loadStats();
      }
    } catch {
      setError("Failed to send invitations.");
    } finally {
      setIsInvitingAll(false);
    }
  }

  // ── Notify matched attendees ─────────────────────────────────────────────
  async function handleNotify() {
    setIsNotifying(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setError("Please sign in again.");
        return;
      }
      const res = await fetch(`/api/admin/events/${eventId}/notify-matches`, {
        method: "POST",
        headers,
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError(json?.error?.message ?? "Failed to notify attendees.");
        return;
      }
      const { matchesNotified, skipped, failed } = json;
      if (matchesNotified === 0 && skipped === 0) {
        setSuccess("No unnotified matches found.");
      } else if (matchesNotified === 0 && skipped > 0) {
        setError(
          `${skipped} match${skipped !== 1 ? "es" : ""} skipped — mark attendance as "Attended" first.`,
        );
      } else {
        const parts = [
          `Notified attendees for ${matchesNotified} match${matchesNotified !== 1 ? "es" : ""}.`,
        ];
        if (skipped > 0) parts.push(`${skipped} skipped (non-attendees).`);
        if (failed > 0)
          parts.push(`${failed} email${failed !== 1 ? "s" : ""} failed.`);
        setSuccess(parts.join(" "));
      }
      await loadStats();
    } catch {
      setError("Failed to notify attendees.");
    } finally {
      setIsNotifying(false);
    }
  }

  // ── Validate cohort ──────────────────────────────────────────────────────
  async function handleValidateCohort() {
    setIsValidatingCohort(true);
    setError(null);
    setSuccess(null);
    setCohortResult(null);
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setError("Please sign in again.");
        return;
      }
      const res = await fetch(`/api/admin/events/${eventId}/validate-cohort`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          minScore,
          ...(locationFilter ? { location: locationFilter } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError(json?.error?.message ?? "Cohort validation failed.");
        return;
      }
      setCohortResult(json as CohortResult);
    } catch {
      setError("Cohort validation failed.");
    } finally {
      setIsValidatingCohort(false);
    }
  }

  // ── Preview matches ──────────────────────────────────────────────────────
  async function handlePreview() {
    setIsPreviewing(true);
    setError(null);
    setSuccess(null);
    setPreview(null);
    setPreviewAvgScore(null);
    setPreviewMatrix(null);
    setDistinctPreview(null);
    setScoringProgress(null);

    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setError("Please sign in again.");
        return;
      }

      if (matchMode === "all_pairs") {
        // Use SSE streaming for real-time progress
        const res = await fetch(
          `/api/admin/events/${eventId}/generate-matches-stream`,
          {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              minScore,
              maxPerGender,
              ...(locationFilter ? { location: locationFilter } : {}),
            }),
          },
        );

        if (!res.ok || !res.body) {
          setError("Preview failed.");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        // eventType must live outside the read loop so it persists across chunk
        // boundaries where the "event:" line and its "data:" line may arrive in
        // separate chunks.
        let eventType = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7);
            } else if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));
              if (eventType === "progress") {
                setScoringProgress(data);
              } else if (eventType === "complete") {
                setScoringProgress(null);
                const recs: PreviewMatch[] = data.recommendations ?? [];
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
                unique.sort((a, b) => b.score - a.score);
                setPreview(unique);
                setPreviewAvgScore(data.avgScore ?? 0);
                if (data.matrix) {
                  setPreviewMatrix(data.matrix as PreviewMatrixData);
                }
                if (data.distinctMatches) {
                  setDistinctPreview(data.distinctMatches as PreviewMatch[]);
                }
              }
            }
          }
        }
      } else {
        // Top-N mode: regular request
        const res = await fetch(
          `/api/admin/events/${eventId}/generate-matches`,
          {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              minScore,
              maxPerApplicant,
              createMatches: false,
              mode: matchMode,
              maxPerGender,
              ...(locationFilter ? { location: locationFilter } : {}),
            }),
          },
        );
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError(json?.error?.message ?? "Preview failed.");
          return;
        }
        const recs: PreviewMatch[] = json.recommendations ?? [];
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
        unique.sort((a, b) => b.score - a.score);
        setPreview(unique);
        setPreviewAvgScore(
          unique.length > 0
            ? Math.round(
                unique.reduce((s, r) => s + r.score, 0) / unique.length,
              )
            : 0,
        );
        if (json.distinctMatches) {
          setDistinctPreview(json.distinctMatches as PreviewMatch[]);
        }
      }
    } catch {
      setError("Preview failed.");
    } finally {
      setIsPreviewing(false);
      setScoringProgress(null);
    }
  }

  // ── Create matches ───────────────────────────────────────────────────────
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
          mode: matchMode,
          maxPerGender,
          ...(locationFilter ? { location: locationFilter } : {}),
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
      setPreviewMatrix(null);
      setDistinctPreview(null);
      await loadStats();
    } catch {
      setError("Failed to create matches.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCreateDistinct() {
    if (!distinctPreview || distinctPreview.length === 0) return;
    setIsCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setError("Please sign in again.");
        return;
      }
      // Pass the pre-computed pairs directly — server skips re-scoring
      const res = await fetch(`/api/admin/events/${eventId}/generate-matches`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          createMatches: true,
          explicitPairs: distinctPreview,
        }),
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError(json?.error?.message ?? "Failed to create distinct matches.");
        return;
      }
      setSuccess(
        `Created ${json.matchesCreated} distinct matches (avg score: ${json.avgScore}).`,
      );
      setPreview(null);
      setPreviewAvgScore(null);
      setPreviewMatrix(null);
      setDistinctPreview(null);
      await loadStats();
    } catch {
      setError("Failed to create distinct matches.");
    } finally {
      setIsCreating(false);
    }
  }

  function resolveName(id: string): string {
    const full = nameMap[id];
    if (!full) return id.slice(0, 8) + "…";
    return abbrev(full);
  }

  const isBusy =
    isPreviewing ||
    isCreating ||
    isNotifying ||
    isInvitingAll ||
    isValidatingCohort ||
    !!invitingId;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <Card className="space-y-6">
      <h2 className="text-lg font-semibold text-navy">Match Generation</h2>

      {/* ── Stats ── */}
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

      {/* ── Existing Matches table ── */}
      {existingMatchList.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-navy-soft uppercase tracking-wide">
            Existing Matches
          </h3>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-stone-50">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-semibold text-stone-600">
                    Person A
                  </th>
                  <th className="px-1 py-2 text-center text-stone-400">↔</th>
                  <th className="px-3 py-2 text-left font-semibold text-stone-600">
                    Person B
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-stone-600">
                    Score
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-stone-600">
                    Notified
                  </th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {existingMatchList.map((match) => (
                  <tr key={match.id} className="hover:bg-stone-50">
                    <td className="px-3 py-2 font-medium text-navy">
                      {abbrev(match.applicantName)}
                    </td>
                    <td className="px-1 py-2 text-center text-stone-400">↔</td>
                    <td className="px-3 py-2 font-medium text-navy">
                      {abbrev(match.partnerName)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-copper tabular-nums">
                      {match.compatibilityScore !== null
                        ? Math.round(match.compatibilityScore)
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {match.notifiedAt ? (
                        <span className="text-xs font-medium text-green-700">
                          ✓ Sent
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Link
                        href={`/admin/matches/${match.id}`}
                        className="text-xs font-medium text-copper hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Matched Individuals ── */}
          <div className="space-y-3 rounded-md border p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-sm font-semibold text-navy">
                Matched Individuals{" "}
                <span className="text-navy-soft font-normal">
                  ({matchedIndividuals.length})
                </span>
              </h3>

              {uninvitedIndividuals.length > 0 ? (
                <Button
                  type="button"
                  onClick={handleInviteAll}
                  disabled={isBusy}
                  className="bg-navy hover:bg-navy/90 text-white"
                >
                  {isInvitingAll
                    ? "Sending…"
                    : `Invite All Uninvited (${uninvitedIndividuals.length})`}
                </Button>
              ) : null}
            </div>

            <div className="divide-y rounded-md border">
              {matchedIndividuals.map((person) => {
                const status = invitationMap[person.id];
                const isThisInviting = invitingId === person.id;
                const isInvited = !!status;

                return (
                  <div
                    key={person.id}
                    className="flex items-center justify-between px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-navy text-sm">
                        {person.name}
                      </span>
                      <InviteStatusBadge status={status} />
                    </div>

                    <Button
                      variant="outline"
                      className="text-xs px-3 py-1 h-7"
                      disabled={isBusy}
                      onClick={() => handleInvite(person.id)}
                    >
                      {isThisInviting
                        ? "Sending…"
                        : isInvited
                          ? "Resend Invite"
                          : "Invite"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Notify Attendees ── */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={handleNotify}
              disabled={isBusy}
              className="bg-green-700 hover:bg-green-800 text-white"
            >
              {isNotifying ? "Notifying…" : "Notify Attendees"}
            </Button>
            <p className="text-xs text-stone-500">
              Emails matched attendees and reveals matches in their dashboard.
            </p>
          </div>
        </div>
      ) : null}

      {/* ── Feedback ── */}
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

      {/* ── Cohort Compatibility ── */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-sm font-semibold text-navy-soft uppercase tracking-wide">
          Cohort Compatibility
        </h3>
        <p className="text-xs text-stone-500">
          Validate that every man–woman pair at this event meets the minimum
          compatibility threshold. All attendees speed-date each other, so
          universal compatibility ensures every conversation has high potential.
        </p>

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
                setCohortResult(null);
                setPreview(null);
                setPreviewAvgScore(null);
                setPreviewMatrix(null);
                setDistinctPreview(null);
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-navy-soft">
              Filter by City
            </label>
            <LocationFilter
              value={locationFilter}
              onChange={(val) => {
                setLocationFilter(val);
                setCohortResult(null);
                setPreview(null);
                setPreviewAvgScore(null);
                setPreviewMatrix(null);
                setDistinctPreview(null);
              }}
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={handleValidateCohort}
          disabled={isBusy}
          variant="outline"
          className="bg-navy/10 hover:bg-navy/20 text-navy border-navy"
        >
          {isValidatingCohort ? "Validating…" : "Validate Cohort"}
        </Button>

        {cohortResult ? (
          <div className="space-y-4">
            {/* Summary */}
            <div
              className={`rounded-md px-4 py-3 text-sm font-medium ${
                cohortResult.valid
                  ? "bg-green-50 text-green-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              {cohortResult.valid ? (
                <>
                  All {cohortResult.stats.totalPairs} pairs pass at{" "}
                  {cohortResult.minScore}% threshold
                </>
              ) : (
                <>
                  {cohortResult.stats.failingPairs} of{" "}
                  {cohortResult.stats.totalPairs} pairs below{" "}
                  {cohortResult.minScore}% threshold
                </>
              )}
              <span className="ml-3 font-normal text-stone-600">
                Avg: {cohortResult.stats.avgScore} · Low:{" "}
                {cohortResult.stats.lowestScore} · High:{" "}
                {cohortResult.stats.highestScore}
              </span>
            </div>

            {/* Matrix grid */}
            {cohortResult.men.length > 0 && cohortResult.women.length > 0 ? (
              <div className="overflow-x-auto rounded-md border">
                <table className="text-xs">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 bg-stone-100 px-2 py-1.5 text-left font-semibold text-stone-500">
                        Men \ Women
                      </th>
                      {cohortResult.women.map((w) => (
                        <th
                          key={w.id}
                          className="bg-stone-50 px-2 py-1.5 text-center font-medium text-navy whitespace-nowrap"
                        >
                          {abbrev(w.name)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cohortResult.men.map((m) => (
                      <tr key={m.id}>
                        <td className="sticky left-0 z-10 bg-stone-50 px-2 py-1.5 font-medium text-navy whitespace-nowrap">
                          {abbrev(m.name)}
                        </td>
                        {cohortResult.women.map((w) => {
                          const pair = cohortResult.matrix.find(
                            (p) => p.manId === m.id && p.womanId === w.id,
                          );
                          const s = pair?.score ?? 0;
                          return (
                            <td
                              key={w.id}
                              className={`px-2 py-1.5 text-center font-semibold tabular-nums ${scoreColor(s, cohortResult.minScore)}`}
                            >
                              {s}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {/* Failing pairs */}
            {cohortResult.belowThreshold.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-red-700 uppercase tracking-wide">
                  Pairs Below Threshold
                </h4>
                <div className="divide-y rounded-md border border-red-200">
                  {cohortResult.belowThreshold.map((pair) => (
                    <div
                      key={`${pair.manId}:${pair.womanId}`}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span className="text-navy">
                        {abbrev(pair.manName)} ↔ {abbrev(pair.womanName)}
                      </span>
                      <span className="font-semibold text-red-600 tabular-nums">
                        {pair.score}
                        {pair.dealbreakersViolated.length > 0
                          ? " (dealbreaker)"
                          : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* ── Generate New Matches ── */}
      <div className="space-y-4 border-t pt-4">
        <h3 className="text-sm font-semibold text-navy-soft uppercase tracking-wide">
          Generate New Matches
        </h3>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-navy-soft">
              Match Mode
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMatchMode("all_pairs");
                  setPreview(null);
                  setPreviewAvgScore(null);
                  setPreviewMatrix(null);
                  setDistinctPreview(null);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  matchMode === "all_pairs"
                    ? "bg-copper text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                All Compatible Pairs
              </button>
              <button
                type="button"
                onClick={() => {
                  setMatchMode("top_n");
                  setPreview(null);
                  setPreviewAvgScore(null);
                  setPreviewMatrix(null);
                  setDistinctPreview(null);
                }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  matchMode === "top_n"
                    ? "bg-copper text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                Top N per Person
              </button>
            </div>
            <p className="text-xs text-stone-400">
              {matchMode === "all_pairs"
                ? "Creates a match for every cross-gender pair above the threshold."
                : "Selects the top N highest-scoring matches per person."}
            </p>
          </div>

          {matchMode === "all_pairs" ? (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-navy-soft">
                Max Individuals per Gender (1–100)
              </label>
              <Input
                type="number"
                min={1}
                max={100}
                value={maxPerGender}
                onChange={(e) => {
                  setMaxPerGender(Number(e.target.value));
                  setPreview(null);
                  setPreviewAvgScore(null);
                  setPreviewMatrix(null);
                  setDistinctPreview(null);
                }}
              />
              <p className="text-xs text-stone-400">
                Caps how many men and women are scored. 25 per gender = up to
                625 pairs.
              </p>
            </div>
          ) : (
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
                  setPreviewMatrix(null);
                  setDistinctPreview(null);
                }}
              />
            </div>
          )}
        </div>

        <Button
          type="button"
          onClick={handlePreview}
          disabled={isBusy}
          variant="outline"
          className="bg-copper/10 hover:bg-copper/20 text-copper border-copper"
        >
          {isPreviewing ? "Scoring…" : "Preview Matches"}
        </Button>

        {/* Scoring progress bar */}
        {scoringProgress ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-stone-500">
              <span>
                Scoring pairs: {scoringProgress.scored} /{" "}
                {scoringProgress.totalPairs}
              </span>
              <span>
                {scoringProgress.pct}% &middot;{" "}
                {(scoringProgress.elapsedMs / 1000).toFixed(1)}s
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full rounded-full bg-copper transition-all duration-300"
                style={{ width: `${scoringProgress.pct}%` }}
              />
            </div>
          </div>
        ) : null}

        {preview !== null ? (
          <div className="space-y-3">
            <div className="text-sm font-medium text-stone-600">
              {preview.length === 0 ? (
                "No matches found at this threshold — try lowering the min score."
              ) : (
                <>
                  Preview: {preview.length} match
                  {preview.length !== 1 ? "es" : ""} above {minScore}%, avg
                  score:{" "}
                  <span className="font-semibold text-navy">
                    {previewAvgScore}
                  </span>
                  {distinctPreview ? (
                    <>
                      {" · "}
                      <span className="font-semibold text-emerald-700">
                        {distinctPreview.length} distinct
                      </span>{" "}
                      (1:1 best)
                    </>
                  ) : null}
                  {previewMatrix
                    ? ` · ${previewMatrix.allPairScores.length} total pairs scored${
                        previewMatrix.truncated
                          ? ` (capped at ${previewMatrix.men.length}M x ${previewMatrix.women.length}W of ${previewMatrix.totalMen}M x ${previewMatrix.totalWomen}W)`
                          : ""
                      }`
                    : ""}
                </>
              )}
            </div>

            {/* All-pairs matrix view */}
            {previewMatrix &&
            previewMatrix.men.length > 0 &&
            previewMatrix.women.length > 0 ? (
              <div className="space-y-3">
                <div className="overflow-x-auto rounded-md border">
                  <table className="text-xs">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 bg-stone-100 px-2 py-1.5 text-left font-semibold text-stone-500">
                          Men \ Women
                        </th>
                        {previewMatrix.women.map((w) => (
                          <th
                            key={w.id}
                            className="bg-stone-50 px-2 py-1.5 text-center font-medium text-navy whitespace-nowrap"
                          >
                            {abbrev(w.name)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {previewMatrix.men.map((m) => (
                        <tr key={m.id}>
                          <td className="sticky left-0 z-10 bg-stone-50 px-2 py-1.5 font-medium text-navy whitespace-nowrap">
                            {abbrev(m.name)}
                          </td>
                          {previewMatrix.women.map((w) => {
                            const pair = previewMatrix.allPairScores.find(
                              (p) => p.manId === m.id && p.womanId === w.id,
                            );
                            const s = pair?.score ?? 0;
                            return (
                              <td
                                key={w.id}
                                className={`px-2 py-1.5 text-center font-semibold tabular-nums ${scoreColor(s, minScore)}`}
                              >
                                {s}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {/* Flat list for top_n mode (or fallback) */}
            {!previewMatrix && preview.length > 0 ? (
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
            ) : null}

            {/* Distinct matches (1:1 best assignment) */}
            {distinctPreview && distinctPreview.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-emerald-700">
                  Distinct Matches (1:1 Best Assignment) —{" "}
                  {distinctPreview.length} pair
                  {distinctPreview.length !== 1 ? "s" : ""}
                </h4>
                <p className="text-xs text-stone-500">
                  Each person appears in exactly one match, selected from
                  highest compatibility first.
                </p>
                <div className="overflow-x-auto rounded-md border border-emerald-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-emerald-50 text-left text-xs text-emerald-800">
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Man</th>
                        <th className="px-3 py-2">Woman</th>
                        <th className="px-3 py-2">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distinctPreview.map((dm, idx) => (
                        <tr
                          key={`${dm.applicantId}-${dm.partnerId}`}
                          className={
                            idx % 2 === 0 ? "bg-white" : "bg-emerald-50/40"
                          }
                        >
                          <td className="px-3 py-1.5 text-stone-400">
                            {idx + 1}
                          </td>
                          <td className="px-3 py-1.5">
                            {resolveName(dm.applicantId)}
                          </td>
                          <td className="px-3 py-1.5">
                            {resolveName(dm.partnerId)}
                          </td>
                          <td
                            className={`px-3 py-1.5 font-semibold ${scoreColor(dm.score, minScore)}`}
                          >
                            {dm.score}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {preview.length > 0 ? (
              <div className="flex flex-wrap items-center gap-3">
                {distinctPreview && distinctPreview.length > 0 ? (
                  <Button
                    type="button"
                    onClick={handleCreateDistinct}
                    disabled={isBusy}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isCreating
                      ? "Creating…"
                      : `Create ${distinctPreview.length} Distinct Match${distinctPreview.length !== 1 ? "es" : ""}`}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={isBusy}
                  variant="outline"
                  className="border-copper text-copper hover:bg-copper/10"
                >
                  {isCreating
                    ? "Creating…"
                    : `Create All ${preview.length} Match${preview.length !== 1 ? "es" : ""}`}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
