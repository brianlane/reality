"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type AdminMatchFormProps = {
  matchId?: string;
  mode: "create" | "edit";
};

type MatchDetail = {
  id: string;
  eventId: string;
  applicantId: string;
  partnerId: string;
  type: string;
  outcome: string;
  compatibilityScore: number | null;
  contactExchanged: boolean;
  notes: string | null;
  deletedAt: string | null;
};

export default function AdminMatchForm({ matchId, mode }: AdminMatchFormProps) {
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [form, setForm] = useState({
    eventId: "",
    applicantId: "",
    partnerId: "",
    type: "CURATED",
    outcome: "PENDING",
    compatibilityScore: "",
    contactExchanged: "false",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (mode !== "edit" || !matchId) return;
    const controller = new AbortController();

    const loadMatch = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          return;
        }
        const res = await fetch(
          `/api/admin/matches/${matchId}?includeDeleted=true`,
          {
            headers,
            signal: controller.signal,
          },
        );
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load match.");
          return;
        }
        const loaded = json.match as MatchDetail;
        setMatch(loaded);
        setForm({
          eventId: loaded.eventId ?? "",
          applicantId: loaded.applicantId ?? "",
          partnerId: loaded.partnerId ?? "",
          type: loaded.type ?? "CURATED",
          outcome: loaded.outcome ?? "PENDING",
          compatibilityScore: loaded.compatibilityScore
            ? String(loaded.compatibilityScore)
            : "",
          contactExchanged: loaded.contactExchanged ? "true" : "false",
          notes: loaded.notes ?? "",
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load match.");
        }
      }
    };

    loadMatch();

    return () => controller.abort();
  }, [mode, matchId]);

  function updateField(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
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
      const payload =
        mode === "create"
          ? {
              eventId: form.eventId,
              applicantId: form.applicantId,
              partnerId: form.partnerId,
              type: form.type,
              compatibilityScore: form.compatibilityScore
                ? Number(form.compatibilityScore)
                : undefined,
            }
          : {
              outcome: form.outcome,
              notes: form.notes || null,
              contactExchanged: form.contactExchanged === "true",
              compatibilityScore: form.compatibilityScore
                ? Number(form.compatibilityScore)
                : undefined,
            };

      const res = await fetch(
        mode === "create"
          ? "/api/admin/matches"
          : `/api/admin/matches/${matchId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to save match.");
        setIsLoading(false);
        return;
      }
      setSuccess("Match saved.");
      setIsLoading(false);
    } catch {
      setError("Failed to save match.");
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!matchId) return;
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
      const res = await fetch(`/api/admin/matches/${matchId}`, {
        method: "DELETE",
        headers,
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to delete match.");
        setIsLoading(false);
        return;
      }
      setSuccess("Match deleted.");
      setMatch((prev) =>
        prev ? { ...prev, deletedAt: new Date().toISOString() } : prev,
      );
      setIsLoading(false);
    } catch {
      setError("Failed to delete match.");
      setIsLoading(false);
    }
  }

  async function handleRestore() {
    if (!matchId) return;
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
      const res = await fetch(`/api/admin/matches/${matchId}/restore`, {
        method: "POST",
        headers,
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to restore match.");
        setIsLoading(false);
        return;
      }
      setSuccess("Match restored.");
      setMatch((prev) => (prev ? { ...prev, deletedAt: null } : prev));
      setIsLoading(false);
    } catch {
      setError("Failed to restore match.");
      setIsLoading(false);
    }
  }

  return (
    <Card className="space-y-4">
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
      <div className="grid gap-4 md:grid-cols-2">
        {mode === "create" ? (
          <>
            <Input
              placeholder="Event ID"
              value={form.eventId}
              onChange={(event) => updateField("eventId", event.target.value)}
            />
            <Input
              placeholder="Applicant ID"
              value={form.applicantId}
              onChange={(event) =>
                updateField("applicantId", event.target.value)
              }
            />
            <Input
              placeholder="Partner ID"
              value={form.partnerId}
              onChange={(event) => updateField("partnerId", event.target.value)}
            />
            <Select
              value={form.type}
              onChange={(event) => updateField("type", event.target.value)}
            >
              <option value="CURATED">Curated</option>
              <option value="MUTUAL_SPEED">Mutual Speed</option>
              <option value="SOCIAL_HOUR">Social Hour</option>
            </Select>
          </>
        ) : null}
        <Select
          value={form.outcome}
          onChange={(event) => updateField("outcome", event.target.value)}
        >
          <option value="PENDING">Pending</option>
          <option value="FIRST_DATE_SCHEDULED">First Date Scheduled</option>
          <option value="FIRST_DATE_COMPLETED">First Date Completed</option>
          <option value="SECOND_DATE">Second Date</option>
          <option value="DATING">Dating</option>
          <option value="RELATIONSHIP">Relationship</option>
          <option value="ENGAGED">Engaged</option>
          <option value="MARRIED">Married</option>
          <option value="NO_CONNECTION">No Connection</option>
          <option value="GHOSTED">Ghosted</option>
        </Select>
        <Select
          value={form.contactExchanged}
          onChange={(event) =>
            updateField("contactExchanged", event.target.value)
          }
        >
          <option value="false">Contact Not Exchanged</option>
          <option value="true">Contact Exchanged</option>
        </Select>
        <Input
          placeholder="Compatibility Score"
          value={form.compatibilityScore}
          onChange={(event) =>
            updateField("compatibilityScore", event.target.value)
          }
        />
      </div>
      <Textarea
        value={form.notes}
        onChange={(event) => updateField("notes", event.target.value)}
        placeholder="Notes"
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isLoading}
          className="bg-copper hover:bg-copper/90"
        >
          {isLoading ? "Saving..." : "Save"}
        </Button>
        {mode === "edit" ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={isLoading}
            >
              Soft Delete
            </Button>
            {match?.deletedAt ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleRestore}
                disabled={isLoading}
              >
                Restore
              </Button>
            ) : null}
          </>
        ) : null}
      </div>
    </Card>
  );
}
