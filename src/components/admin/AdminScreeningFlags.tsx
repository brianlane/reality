"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";
import type { FlagSeverity } from "@prisma/client";

type SignalDetail = {
  signalName: string;
  questionPrompt: string;
  severity: string;
  reason: string;
};

type ScreeningFlagsData = {
  relationshipReadinessFlag: FlagSeverity | null;
  saScreeningFlag: FlagSeverity | null;
  screeningFlagDetails: {
    readiness: SignalDetail[];
    saRisk: SignalDetail[];
  } | null;
  screeningFlagComputedAt: string | null;
  screeningFlagReviewedAt: string | null;
  screeningFlagReviewedBy: string | null;
  screeningFlagOverride: boolean;
};

const FLAG_STYLES: Record<string, { bg: string; text: string; label: string }> =
  {
    GREEN: {
      bg: "bg-green-50 border-green-200",
      text: "text-green-700",
      label: "Green",
    },
    YELLOW: {
      bg: "bg-yellow-50 border-yellow-200",
      text: "text-yellow-700",
      label: "Yellow",
    },
    RED: {
      bg: "bg-red-50 border-red-200",
      text: "text-red-700",
      label: "Red",
    },
  };

const SIGNAL_DOT: Record<string, string> = {
  GREEN: "bg-green-500",
  YELLOW: "bg-yellow-400",
  RED: "bg-red-500",
};

function FlagCard({
  title,
  severity,
  signals,
}: {
  title: string;
  severity: FlagSeverity | null;
  signals: SignalDetail[];
}) {
  const [expanded, setExpanded] = useState(false);
  const style = severity ? FLAG_STYLES[severity] : null;

  return (
    <div
      className={`rounded-lg border p-4 ${style ? style.bg : "bg-slate-50 border-slate-200"}`}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-navy">{title}</h4>
        <span
          className={`text-xs font-bold uppercase ${style ? style.text : "text-slate-400"}`}
        >
          {severity ?? "Not computed"}
        </span>
      </div>
      {signals.length > 0 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs text-copper hover:underline cursor-pointer"
          >
            {expanded ? "Hide" : "Show"} {signals.length} signal
            {signals.length !== 1 ? "s" : ""}
          </button>
          {expanded && (
            <ul className="mt-2 space-y-2">
              {signals.map((signal, i) => (
                <li
                  key={i}
                  className="rounded bg-white/70 border border-slate-200 p-2 text-xs"
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${SIGNAL_DOT[signal.severity] ?? "bg-slate-300"}`}
                    />
                    <div className="min-w-0">
                      <span className="font-semibold text-navy">
                        {signal.signalName}
                      </span>
                      <p className="mt-0.5 text-slate-600">{signal.reason}</p>
                      {signal.questionPrompt && (
                        <p className="mt-0.5 text-slate-400 truncate">
                          Q: {signal.questionPrompt}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default function AdminScreeningFlags({
  applicantId,
}: {
  applicantId: string;
}) {
  const [data, setData] = useState<ScreeningFlagsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFlags = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      if (!headers) return;
      const res = await fetch(`/api/admin/applications/${applicantId}`, {
        headers,
      });
      const json = await res.json();
      if (json?.screeningFlags) {
        setData(json.screeningFlags);
      }
    } catch {
      setError("Failed to load screening flags");
    } finally {
      setLoading(false);
    }
  }, [applicantId]);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  const handleCompute = async () => {
    setComputing(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      if (!headers) return;
      const res = await fetch(
        `/api/admin/applications/${applicantId}/compute-flags`,
        { method: "POST", headers },
      );
      if (!res.ok) {
        const json = await res.json();
        setError(json?.error?.message ?? "Failed to compute flags");
        return;
      }
      await loadFlags();
    } catch {
      setError("Failed to compute flags");
    } finally {
      setComputing(false);
    }
  };

  const handleToggleOverride = async () => {
    if (!data) return;
    // Confirm before removing an active override — this re-blocks the applicant.
    if (data.screeningFlagOverride) {
      const confirmed = window.confirm(
        "Remove override? This applicant will be blocked from matching again until re-overridden.",
      );
      if (!confirmed) return;
    }
    setToggling(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      if (!headers) return;
      const res = await fetch(
        `/api/admin/applications/${applicantId}/flag-override`,
        {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ override: !data.screeningFlagOverride }),
        },
      );
      if (!res.ok) {
        const json = await res.json();
        setError(json?.error?.message ?? "Failed to toggle override");
        return;
      }
      await loadFlags();
    } catch {
      setError("Failed to toggle override");
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <h3 className="text-lg font-semibold text-navy">Screening Flags</h3>
        <p className="mt-2 text-sm text-slate-400">Loading...</p>
      </Card>
    );
  }

  const details = data?.screeningFlagDetails;
  const readinessSignals = details?.readiness ?? [];
  const saSignals = details?.saRisk ?? [];

  const hasRedFlag =
    data?.relationshipReadinessFlag === "RED" ||
    data?.saScreeningFlag === "RED";

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-navy">Screening Flags</h3>
        <div className="flex items-center gap-2">
          {data?.screeningFlagComputedAt && (
            <span className="text-xs text-slate-400">
              Computed{" "}
              {new Date(data.screeningFlagComputedAt).toLocaleDateString()}
            </span>
          )}
          <Button
            variant="outline"
            className="text-xs h-7 px-3"
            onClick={handleCompute}
            disabled={computing}
          >
            {computing ? "Computing..." : "Recompute"}
          </Button>
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {!data?.relationshipReadinessFlag && !data?.saScreeningFlag ? (
        <p className="mt-3 text-sm text-slate-500">
          No screening flags computed yet. Click &quot;Recompute&quot; to
          analyze this applicant&apos;s questionnaire responses.
        </p>
      ) : (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <FlagCard
              title="Relationship Readiness"
              severity={data?.relationshipReadinessFlag ?? null}
              signals={readinessSignals}
            />
            <FlagCard
              title="SA Screening"
              severity={data?.saScreeningFlag ?? null}
              signals={saSignals}
            />
          </div>

          {hasRedFlag && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div>
                <p className="text-sm font-medium text-navy">
                  Admin Override
                  {data?.screeningFlagOverride && (
                    <span className="ml-2 text-xs font-normal text-copper">
                      Active
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {data?.screeningFlagOverride
                    ? "This applicant will be included in matching despite RED flags."
                    : "RED flags currently block this applicant from matching."}
                </p>
                {data?.screeningFlagReviewedAt && (
                  <p className="text-xs text-slate-400 mt-1">
                    Last reviewed:{" "}
                    {new Date(
                      data.screeningFlagReviewedAt,
                    ).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Button
                variant={data?.screeningFlagOverride ? "secondary" : "outline"}
                className="text-xs h-7 px-3 shrink-0"
                onClick={handleToggleOverride}
                disabled={toggling}
              >
                {toggling
                  ? "Saving..."
                  : data?.screeningFlagOverride
                    ? "Remove Override"
                    : "Override Flags"}
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
