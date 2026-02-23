"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

type ResearchApplicant = {
  id: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  applicationStatus: string;
  researchInviteCode: string | null;
  researchInvitedAt: string | null;
  researchInviteUsedAt: string | null;
  researchCompletedAt: string | null;
};

type AdminResearchInviteTableProps = {
  initialApplicants: ResearchApplicant[];
  initialError?: string | null;
};

export default function AdminResearchInviteTable({
  initialApplicants,
  initialError = null,
}: AdminResearchInviteTableProps) {
  const [applicants, setApplicants] =
    useState<ResearchApplicant[]>(initialApplicants);
  const [error, setError] = useState<string | null>(initialError);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sendingResumeId, setSendingResumeId] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const loadResearchInvites = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setError("Please sign in again.");
        return;
      }
      const res = await fetch("/api/admin/research-invites", { headers });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to load research invites.");
        return;
      }
      setApplicants(json.applicants ?? []);
      setError(null);
    } catch (err) {
      console.error("Error loading research invites:", err);
      setError("Failed to load research invites.");
    }
  }, []);

  function updateField(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleCreateInvite() {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setInviteUrl(null);
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setError("Please sign in again.");
        setIsLoading(false);
        return;
      }
      const res = await fetch("/api/admin/research-invites", {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError(json?.error?.message || "Failed to create research invite.");
        setIsLoading(false);
        return;
      }

      const emailNote = json.emailSent
        ? " Invite email sent."
        : " Email could not be sent — please share the link manually.";
      setSuccess(`Research invite created.${emailNote}`);
      setInviteUrl(json.inviteUrl ?? null);
      setForm({ firstName: "", lastName: "", email: "" });
      await loadResearchInvites();
    } catch (err) {
      console.error("Error creating research invite:", err);
      setError("Failed to create research invite.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleHardDelete(applicantId: string) {
    if (
      !window.confirm(
        "Permanently delete this research participant and all related data? This cannot be undone.",
      )
    ) {
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
      const res = await fetch(
        `/api/admin/applications/${applicantId}/hard-delete`,
        {
          method: "DELETE",
          headers,
        },
      );
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to permanently delete participant.");
        setIsLoading(false);
        return;
      }
      setSuccess("Participant permanently deleted.");
      await loadResearchInvites();
    } catch (err) {
      console.error("Error deleting research participant:", err);
      setError("Failed to permanently delete participant.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSendResumeEmail(applicantId: string) {
    setError(null);
    setSuccess(null);
    setSendingResumeId(applicantId);
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setError("Please sign in again.");
        setSendingResumeId(null);
        return;
      }
      const res = await fetch(`/api/admin/research-invites/${applicantId}`, {
        method: "POST",
        headers,
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError(json?.error?.message || "Failed to send resume email.");
        setSendingResumeId(null);
        return;
      }

      if (json?.inviteUrl) {
        setInviteUrl(json.inviteUrl);
      }
      const emailNote = json?.emailSent
        ? " Resume email sent."
        : " Could not send email, but the resume link is available.";
      setSuccess(`Research resume link ready.${emailNote}`);
      await loadResearchInvites();
    } catch (err) {
      console.error("Error sending research resume email:", err);
      setError("Failed to send resume email.");
    } finally {
      setSendingResumeId(null);
    }
  }

  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  function getInviteUrl(code: string | null) {
    if (!code) return null;
    return `${APP_URL}/research?code=${code}`;
  }

  async function copyToClipboard(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-navy">
          Create Research Invite
        </h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder="First name"
            value={form.firstName}
            onChange={(event) => updateField("firstName", event.target.value)}
          />
          <Input
            placeholder="Last name"
            value={form.lastName}
            onChange={(event) => updateField("lastName", event.target.value)}
          />
          <Input
            placeholder="Email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleCreateInvite}
            disabled={isLoading}
            className="bg-copper hover:bg-copper/90"
          >
            {isLoading ? "Creating..." : "Create Invite"}
          </Button>
          {inviteUrl ? (
            <span className="flex items-center gap-2 text-sm text-navy-soft">
              <span className="truncate">
                Invite link:{" "}
                <a
                  className="text-copper hover:underline"
                  href={inviteUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {inviteUrl}
                </a>
              </span>
              <Button
                type="button"
                variant="outline"
                className="shrink-0 text-xs"
                onClick={() => copyToClipboard(inviteUrl, "new-invite")}
              >
                {copiedId === "new-invite" ? "Copied!" : "Copy"}
              </Button>
            </span>
          ) : null}
        </div>
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
            {success}
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy">
            Research Participants ({applicants.length})
          </h2>
          <Button variant="outline" onClick={loadResearchInvites}>
            Refresh
          </Button>
        </div>

        {applicants.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            No research invites yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="mt-4 min-w-[980px]">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3 text-left">Name</th>
                  <th className="px-3 py-3 text-left">Email</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3 text-left">Invited</th>
                  <th className="px-3 py-3 text-left">Started</th>
                  <th className="px-3 py-3 text-left">Completed</th>
                  <th className="px-3 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((applicant) => (
                  <tr
                    key={applicant.id}
                    className="border-b align-top text-sm text-navy-soft"
                  >
                    <td className="px-3 py-3 font-medium text-navy">
                      {applicant.user.firstName} {applicant.user.lastName}
                    </td>
                    <td className="px-3 py-3">{applicant.user.email}</td>
                    <td className="px-3 py-3">
                      <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {applicant.applicationStatus}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {formatDate(applicant.researchInvitedAt)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {formatDate(applicant.researchInviteUsedAt)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {formatDate(applicant.researchCompletedAt)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/admin/research/${applicant.id}`}>
                          <Button
                            type="button"
                            variant="outline"
                            className="h-8 px-3 text-xs"
                          >
                            View Responses
                          </Button>
                        </Link>
                        {applicant.researchInviteCode ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              copyToClipboard(
                                getInviteUrl(applicant.researchInviteCode)!,
                                applicant.id,
                              )
                            }
                            className="h-8 px-3 text-xs"
                          >
                            {copiedId === applicant.id
                              ? "Copied!"
                              : "Copy Link"}
                          </Button>
                        ) : null}
                        {applicant.applicationStatus !==
                        "RESEARCH_COMPLETED" ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleSendResumeEmail(applicant.id)}
                            disabled={sendingResumeId === applicant.id}
                            className="h-8 px-3 text-xs"
                          >
                            {sendingResumeId === applicant.id
                              ? "Sending..."
                              : "Send Resume Link"}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleHardDelete(applicant.id)}
                          disabled={isLoading}
                          className="h-8 border-red-300 px-3 text-xs text-red-600 hover:bg-red-50"
                        >
                          Hard Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
