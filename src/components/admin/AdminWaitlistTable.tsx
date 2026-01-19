"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type WaitlistApplicant = {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  age: number;
  gender: string;
  location: string;
  stage1Responses: any;
  waitlistedAt: string;
  invitedOffWaitlistAt: string | null;
};

export default function AdminWaitlistTable() {
  const [applicants, setApplicants] = useState<WaitlistApplicant[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadWaitlist();
  }, []);

  async function loadWaitlist() {
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setError("Please sign in again.");
        return;
      }

      const res = await fetch("/api/admin/waitlist", { headers });
      const json = await res.json();

      if (!res.ok || json?.error) {
        setError("Failed to load waitlist.");
        return;
      }

      setApplicants(json.applicants ?? []);
      setError(null);
    } catch (err) {
      console.error("Error loading waitlist:", err);
      setError("Failed to load waitlist.");
    }
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === applicants.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(applicants.map((a) => a.id)));
    }
  }

  async function inviteSingle(applicantId: string) {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setError("Please sign in again.");
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `/api/admin/applications/${applicantId}/invite-off-waitlist`,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData?.error?.message || "Failed to send invitation.");
        setIsLoading(false);
        return;
      }

      setSuccess("Invitation sent successfully!");
      await loadWaitlist();
      setIsLoading(false);
    } catch (err) {
      console.error("Error inviting applicant:", err);
      setError("Failed to send invitation.");
      setIsLoading(false);
    }
  }

  async function inviteBatch() {
    if (selectedIds.size === 0) {
      setError("Please select at least one applicant.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setError("Please sign in again.");
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/admin/waitlist/batch-invite", {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          applicantIds: Array.from(selectedIds),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData?.error?.message || "Failed to send invitations.");
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      setSuccess(
        `Successfully invited ${data.summary.succeeded} applicant(s). ${data.summary.failed > 0 ? `Failed: ${data.summary.failed}` : ""}`,
      );
      setSelectedIds(new Set());
      await loadWaitlist();
      setIsLoading(false);
    } catch (err) {
      console.error("Error batch inviting:", err);
      setError("Failed to send invitations.");
      setIsLoading(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getRelationshipGoal(stage1Responses: any) {
    if (!stage1Responses) return "N/A";
    return stage1Responses.relationshipGoal || "N/A";
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy">
          Waitlist ({applicants.length})
        </h2>
        {selectedIds.size > 0 && (
          <Button
            onClick={inviteBatch}
            disabled={isLoading}
            className="bg-copper hover:bg-copper/90"
          >
            {isLoading
              ? "Sending..."
              : `Invite ${selectedIds.size} Selected`}
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-600">
          {success}
        </div>
      )}

      {applicants.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">
          No applicants on the waitlist
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="mt-4">
            <thead>
              <tr className="border-b text-xs uppercase text-slate-400">
                <th className="py-2 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === applicants.length}
                    onChange={toggleSelectAll}
                    className="cursor-pointer"
                  />
                </th>
                <th className="py-2 text-left">Name</th>
                <th className="py-2 text-left">Location</th>
                <th className="py-2 text-left">Age</th>
                <th className="py-2 text-left">Waitlisted</th>
                <th className="py-2 text-left">Goal</th>
                <th className="py-2 text-left">Status</th>
                <th className="py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applicants.map((applicant) => (
                <tr
                  key={applicant.id}
                  className="border-b text-sm text-navy-soft"
                >
                  <td className="py-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(applicant.id)}
                      onChange={() => toggleSelection(applicant.id)}
                      disabled={!!applicant.invitedOffWaitlistAt}
                      className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </td>
                  <td className="py-2">
                    {applicant.user.firstName} {applicant.user.lastName}
                  </td>
                  <td className="py-2">{applicant.location}</td>
                  <td className="py-2">{applicant.age}</td>
                  <td className="py-2">{formatDate(applicant.waitlistedAt)}</td>
                  <td className="py-2">
                    {getRelationshipGoal(applicant.stage1Responses)}
                  </td>
                  <td className="py-2">
                    {applicant.invitedOffWaitlistAt ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                        Invited
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="py-2">
                    {!applicant.invitedOffWaitlistAt ? (
                      <button
                        type="button"
                        onClick={() => inviteSingle(applicant.id)}
                        disabled={isLoading}
                        className="text-xs font-medium text-copper hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Invite
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {formatDate(applicant.invitedOffWaitlistAt)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </Card>
  );
}
