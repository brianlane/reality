"use client";

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type AuditLogEntry = {
  id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  admin: { name: string; email: string | null };
  applicant: { id: string; name: string };
};

export default function ScreeningAuditLogTable() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const limit = 50;

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setError("Please sign in again.");
        return;
      }
      const res = await fetch(
        `/api/admin/audit-log?limit=${limit}&offset=${offset}`,
        { headers },
      );
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs);
        setTotal(data.total);
      } else {
        setError(data.error?.message || "Failed to load audit logs");
      }
    } catch {
      setError("Failed to load audit logs");
    } finally {
      setIsLoading(false);
    }
  }, [offset]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const actionLabel = (action: string) => {
    const labels: Record<string, string> = {
      VIEW_REPORT: "Viewed Report",
      TRIGGER_CHECK: "Triggered Check",
      IDENFY_WEBHOOK: "iDenfy Webhook",
      CHECKR_REPORT_COMPLETED: "Checkr Report Completed",
      CHECKR_INVITATION_COMPLETED: "Checkr Invitation Completed",
      CHECKR_INVITATION_SENT: "Checkr Invitation Sent",
      CHECKR_AUTO_TRIGGERED: "Checkr Auto-Triggered",
      CONTINUOUS_MONITOR_ALERT: "Monitoring Alert",
      FCRA_CONSENT_GIVEN: "FCRA Consent",
    };
    return labels[action] || action.replace(/_/g, " ");
  };

  if (isLoading && logs.length === 0) {
    return (
      <Card className="p-8 text-center text-navy-soft">
        Loading audit logs...
      </Card>
    );
  }

  if (error) {
    return <Card className="p-8 text-center text-red-600">{error}</Card>;
  }

  if (logs.length === 0) {
    return (
      <Card className="p-8 text-center text-navy-soft">
        No audit log entries found.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-medium text-navy-soft uppercase tracking-wider">
                Timestamp
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-navy-soft uppercase tracking-wider">
                Action
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-navy-soft uppercase tracking-wider">
                Performed By
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-navy-soft uppercase tracking-wider">
                Applicant
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-navy-soft uppercase tracking-wider">
                Details
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-navy">
                    {actionLabel(log.action)}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {log.admin.name}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {log.applicant.name}
                </td>
                <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">
                  {log.metadata
                    ? JSON.stringify(log.metadata).slice(0, 100)
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 bg-slate-50">
        <p className="text-xs text-slate-500">
          Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0 || isLoading}
            className="text-xs px-3 py-1"
          >
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => setOffset(offset + limit)}
            disabled={offset + limit >= total || isLoading}
            className="text-xs px-3 py-1"
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}
