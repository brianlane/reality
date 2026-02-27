"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";
import PaginationControls from "@/components/admin/PaginationControls";

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
  stage1Responses: unknown | null;
  waitlistedAt: string | null;
  invitedOffWaitlistAt: string | null;
};

type AdminWaitlistTableProps = {
  initialApplicants: WaitlistApplicant[];
  initialError?: string | null;
};

export default function AdminWaitlistTable({
  initialApplicants,
  initialError = null,
}: AdminWaitlistTableProps) {
  const [applicants, setApplicants] =
    useState<WaitlistApplicant[]>(initialApplicants);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(initialError);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(initialApplicants.length);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadWaitlist = useCallback(async (p = page, q = search) => {
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setError("Please sign in again.");
        return;
      }
      const searchParam = q ? `&search=${encodeURIComponent(q)}` : "";
      const res = await fetch(`/api/admin/waitlist?page=${p}${searchParam}`, { headers });
      const json = await res.json();

      if (!res.ok || json?.error) {
        setError("Failed to load waitlist.");
        return;
      }

      const waitlistApplicants = (json.applicants ?? []) as WaitlistApplicant[];
      setApplicants(waitlistApplicants);
      setPages(json.pagination?.pages ?? 1);
      setTotal(json.pagination?.total ?? waitlistApplicants.length);
      setSelectedIds((prev) => {
        if (prev.size === 0) {
          return prev;
        }
        const uninvitedIds = new Set(
          waitlistApplicants
            .filter((applicant) => !applicant.invitedOffWaitlistAt)
            .map((applicant) => applicant.id),
        );
        const next = new Set(
          Array.from(prev).filter((id) => uninvitedIds.has(id)),
        );
        return next.size === prev.size ? prev : next;
      });
      setError(null);
    } catch (err) {
      console.error("Error loading waitlist:", err);
      setError("Failed to load waitlist.");
    }
  }, [page, search]);

  function toggleSelection(id: string) {
    const applicant = applicants.find((candidate) => candidate.id === id);
    if (!applicant || applicant.invitedOffWaitlistAt) {
      return;
    }
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
    // Only include applicants who haven't been invited yet
    const uninvitedApplicants = applicants.filter(
      (a) => !a.invitedOffWaitlistAt,
    );
    const uninvitedIds = uninvitedApplicants.map((a) => a.id);

    // If all uninvited applicants are selected, deselect all
    const allUninvitedSelected = uninvitedIds.every((id) =>
      selectedIds.has(id),
    );

    if (allUninvitedSelected && selectedIds.size > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(uninvitedIds));
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
    const eligibleIds = Array.from(selectedIds).filter((id) =>
      applicants.some(
        (applicant) => applicant.id === id && !applicant.invitedOffWaitlistAt,
      ),
    );

    if (eligibleIds.length === 0) {
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
          applicantIds: eligibleIds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData?.error?.message || "Failed to send invitations.");
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      const failedSummary =
        data.summary.failed > 0 ? `Failed: ${data.summary.failed}` : "";
      setSuccess(
        `Successfully invited ${data.summary.succeeded} applicant(s). ${failedSummary}`,
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

  function formatDate(dateString: string | null) {
    if (!dateString) {
      return "N/A";
    }
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) {
      return "N/A";
    }
    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-navy">
          Waitlist ({total})
        </h2>
        <Input
          placeholder="Search name or email…"
          className="h-8 w-48 text-sm"
          onChange={(e) => {
            const val = e.target.value;
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
            searchTimeout.current = setTimeout(() => {
              setSearch(val);
              setPage(1);
              loadWaitlist(1, val);
            }, 300);
          }}
        />
        {selectedIds.size > 0 && (
          <Button
            onClick={inviteBatch}
            disabled={isLoading}
            className="ml-auto bg-copper hover:bg-copper/90"
          >
            {isLoading ? "Sending..." : `Invite ${selectedIds.size} Selected`}
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
                    checked={
                      applicants.filter((a) => !a.invitedOffWaitlistAt).length >
                        0 &&
                      applicants
                        .filter((a) => !a.invitedOffWaitlistAt)
                        .every((a) => selectedIds.has(a.id))
                    }
                    onChange={toggleSelectAll}
                    className="cursor-pointer"
                  />
                </th>
                <th className="py-2 text-left">Name</th>
                <th className="py-2 text-left">Email</th>
                <th className="py-2 text-left">Location</th>
                <th className="py-2 text-left">Age</th>
                <th className="py-2 text-left">Waitlisted</th>
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
                  <td className="py-2">{applicant.user.email}</td>
                  <td className="py-2">{applicant.location}</td>
                  <td className="py-2">{applicant.age}</td>
                  <td className="py-2">{formatDate(applicant.waitlistedAt)}</td>
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
                    <div>
                      <Link
                        href={`/admin/waitlist/${applicant.id}`}
                        className="text-xs text-copper hover:underline"
                      >
                        Details
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
      <PaginationControls
        page={page}
        pages={pages}
        total={total}
        onPageChange={(p) => { setPage(p); loadWaitlist(p, search); }}
      />
    </Card>
  );
}
