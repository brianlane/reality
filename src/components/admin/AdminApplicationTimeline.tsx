"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type TimelineData = {
  createdAt: string | null;
  submittedAt: string | null;
  questionnaireStartedAt: string | null;
  reviewedAt: string | null;
  invitedOffWaitlistAt: string | null;
  softRejectedAt: string | null;
};

function formatDateTime(val: string | null | undefined) {
  if (!val) return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} ${time}`;
}

function formatDuration(startVal: string | null, endVal: string | null) {
  if (!startVal || !endVal) return null;
  const start = new Date(startVal);
  const end = new Date(endVal);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return null;
  const totalMinutes = Math.floor(diffMs / 60000);
  if (totalMinutes < 1) return "< 1m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days > 0) return `${days}d ${remHours}h`;
  return `${hours}h ${minutes}m`;
}

type Stage = {
  label: string;
  timestamp: string | null;
  durationFrom: string | null;
};

export default function AdminApplicationTimeline({
  applicationId,
}: {
  applicationId: string;
}) {
  const [data, setData] = useState<TimelineData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) { setError("Please sign in again."); return; }
        const res = await fetch(
          `/api/admin/applications/${applicationId}?includeDeleted=true`,
          { headers, signal: controller.signal },
        );
        const json = await res.json();
        if (!res.ok || json?.error) { setError("Failed to load timeline."); return; }
        const a = json.applicant;
        setData({
          createdAt: a.createdAt ?? null,
          submittedAt: a.submittedAt ?? null,
          questionnaireStartedAt: a.questionnaireStartedAt ?? null,
          reviewedAt: a.reviewedAt ?? null,
          invitedOffWaitlistAt: a.invitedOffWaitlistAt ?? null,
          softRejectedAt: a.softRejectedAt ?? null,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError("Failed to load timeline.");
      }
    };
    load();
    return () => controller.abort();
  }, [applicationId]);

  if (error) return null;
  if (!data) return null;

  const stages: Stage[] = [
    { label: "Account Created", timestamp: data.createdAt, durationFrom: null },
    { label: "Application Submitted", timestamp: data.submittedAt, durationFrom: data.createdAt },
    { label: "Questionnaire Started", timestamp: data.questionnaireStartedAt, durationFrom: data.submittedAt },
    { label: "Reviewed", timestamp: data.reviewedAt, durationFrom: data.questionnaireStartedAt ?? data.submittedAt },
    { label: "Invited Off Waitlist", timestamp: data.invitedOffWaitlistAt, durationFrom: data.reviewedAt },
    { label: "Soft Rejected", timestamp: data.softRejectedAt, durationFrom: data.reviewedAt },
  ].filter((s) => s.timestamp !== null);

  if (stages.length === 0) return null;

  return (
    <Card className="space-y-3">
      <h2 className="text-base font-semibold text-navy">Application Timeline</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-xs uppercase tracking-wide text-slate-400">
              <th className="py-2 pr-6 text-left">Stage</th>
              <th className="py-2 pr-6 text-left">Date & Time</th>
              <th className="py-2 text-left">Time Since Previous</th>
            </tr>
          </thead>
          <tbody>
            {stages.map((stage, i) => {
              const duration = formatDuration(stage.durationFrom, stage.timestamp);
              return (
                <tr key={stage.label} className="border-b last:border-0">
                  <td className="py-2 pr-6 font-medium text-navy whitespace-nowrap">
                    <span className="inline-flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-copper/10 text-[10px] font-bold text-copper">
                        {i + 1}
                      </span>
                      {stage.label}
                    </span>
                  </td>
                  <td className="py-2 pr-6 text-navy-soft whitespace-nowrap">
                    {formatDateTime(stage.timestamp) ?? "—"}
                  </td>
                  <td className="py-2 text-slate-400 whitespace-nowrap">
                    {i === 0 ? "—" : duration ? `+${duration}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
