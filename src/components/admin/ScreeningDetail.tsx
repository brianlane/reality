"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type ScreeningStatus = "PENDING" | "IN_PROGRESS" | "PASSED" | "FAILED";

type ScreeningData = {
  screeningStatus: ScreeningStatus;
  idenfyStatus: ScreeningStatus;
  idenfyVerificationId: string | null;
  checkrStatus: ScreeningStatus;
  checkrReportId: string | null;
  checkrCandidateId: string | null;
  backgroundCheckConsentAt: string | null;
  backgroundCheckConsentIp: string | null;
  backgroundCheckNotes: string | null;
  continuousMonitoringId: string | null;
};

type Props = {
  applicationId: string;
  screening: ScreeningData;
  onRefresh?: () => void;
};

const statusBadge = (status: ScreeningStatus) => {
  const styles: Record<ScreeningStatus, string> = {
    PENDING: "bg-slate-100 text-slate-600",
    IN_PROGRESS: "bg-blue-100 text-blue-700",
    PASSED: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
};

export default function ScreeningDetail({
  applicationId,
  screening,
  onRefresh,
}: Props) {
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportData, setReportData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);

  const fetchReport = async () => {
    setIsLoadingReport(true);
    setReportData(null);
    try {
      const headers = await getAuthHeaders();
      if (!headers) return;
      const res = await fetch(
        `/api/admin/applications/${applicationId}/screening-report`,
        { headers },
      );
      const data = await res.json();
      if (res.ok) {
        setReportData(data);
      } else {
        setActionError(data.error?.message || "Failed to fetch report");
      }
    } catch {
      setActionError("Failed to fetch report");
    } finally {
      setIsLoadingReport(false);
    }
  };

  const triggerScreening = async () => {
    setIsTriggering(true);
    setActionError(null);
    setActionMessage(null);
    try {
      const headers = await getAuthHeaders();
      if (!headers) return;

      const res = await fetch("/api/applications/background-check", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });
      const data = await res.json();
      if (res.ok) {
        setActionMessage(data.message || "Screening triggered");
        onRefresh?.();
      } else {
        setActionError(data.error?.message || "Failed to trigger screening");
      }
    } catch {
      setActionError("Failed to trigger screening");
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <Card className="space-y-5">
      <h3 className="text-sm font-semibold text-navy uppercase tracking-wider">
        Background Check Details
      </h3>

      {/* Status Timeline */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-navy-soft font-medium">
            Identity (iDenfy)
          </p>
          {statusBadge(screening.idenfyStatus)}
          {screening.idenfyVerificationId && (
            <p className="text-xs text-slate-400 truncate">
              Ref: {screening.idenfyVerificationId}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs text-navy-soft font-medium">
            Background (Checkr)
          </p>
          {statusBadge(screening.checkrStatus)}
          {screening.checkrReportId && (
            <p className="text-xs text-slate-400 truncate">
              Report: {screening.checkrReportId}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs text-navy-soft font-medium">Overall</p>
          {statusBadge(screening.screeningStatus)}
          {screening.continuousMonitoringId && (
            <p className="text-xs text-green-600">
              Continuous monitoring active
            </p>
          )}
        </div>
      </div>

      {/* FCRA Consent Info */}
      <div className="border-t border-slate-100 pt-3">
        <p className="text-xs font-medium text-navy-soft mb-1">FCRA Consent</p>
        {screening.backgroundCheckConsentAt ? (
          <div className="text-xs text-slate-500 space-y-0.5">
            <p>
              Consented:{" "}
              {new Date(screening.backgroundCheckConsentAt).toLocaleString()}
            </p>
            {screening.backgroundCheckConsentIp && (
              <p>IP: {screening.backgroundCheckConsentIp}</p>
            )}
          </div>
        ) : (
          <p className="text-xs text-amber-600">Consent not yet provided</p>
        )}
      </div>

      {/* Admin Actions */}
      <div className="border-t border-slate-100 pt-3 space-y-3">
        {/* Trigger Screening */}
        {(screening.checkrStatus === "PENDING" ||
          screening.checkrStatus === "FAILED") &&
          screening.idenfyStatus === "PASSED" &&
          screening.backgroundCheckConsentAt && (
            <Button
              onClick={triggerScreening}
              disabled={isTriggering}
              className="bg-copper hover:bg-copper/90 text-sm"
            >
              {isTriggering
                ? "Triggering..."
                : screening.checkrStatus === "FAILED"
                  ? "Retry Background Check"
                  : "Trigger Background Check"}
            </Button>
          )}

        {/* View Report */}
        {screening.checkrReportId && (
          <div>
            <Button
              onClick={fetchReport}
              disabled={isLoadingReport}
              variant="outline"
              className="text-sm"
            >
              {isLoadingReport ? "Loading Report..." : "View Checkr Report"}
            </Button>
            {reportData && (
              <div className="mt-3 rounded-md bg-slate-50 p-3 text-xs">
                <pre className="whitespace-pre-wrap overflow-auto max-h-64">
                  {JSON.stringify(reportData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      {actionMessage && (
        <div className="rounded-md bg-green-50 p-2 text-xs text-green-700">
          {actionMessage}
        </div>
      )}
      {actionError && (
        <div className="rounded-md bg-red-50 p-2 text-xs text-red-600">
          {actionError}
        </div>
      )}

      {/* Notes */}
      {screening.backgroundCheckNotes && (
        <div className="border-t border-slate-100 pt-3">
          <p className="text-xs font-medium text-navy-soft mb-1">
            Screening Notes
          </p>
          <pre className="text-xs text-slate-500 whitespace-pre-wrap bg-slate-50 rounded p-2">
            {screening.backgroundCheckNotes}
          </pre>
        </div>
      )}
    </Card>
  );
}
