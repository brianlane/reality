"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type AdminEventFormProps = {
  eventId?: string;
  mode: "create" | "edit";
};

type EventDetail = {
  id: string;
  name: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  venueAddress: string;
  capacity: number;
  status: string;
  expectedRevenue: number;
  actualRevenue: number;
  totalCost: number;
  notes: string | null;
  deletedAt: string | null;
};

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminEventForm({ eventId, mode }: AdminEventFormProps) {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [form, setForm] = useState({
    name: "",
    date: "",
    startTime: "",
    endTime: "",
    venue: "",
    venueAddress: "",
    capacity: "",
    expectedRevenue: "",
    venueCost: "",
    cateringCost: "",
    materialsCost: "",
    totalCost: "",
    status: "DRAFT",
    notes: "",
    actualRevenue: "",
    actualCost: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [matchesInfo, setMatchesInfo] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== "edit" || !eventId) return;
    const controller = new AbortController();

    const loadEvent = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          return;
        }
        const res = await fetch(
          `/api/admin/events/${eventId}?includeDeleted=true`,
          {
            headers,
            signal: controller.signal,
          },
        );
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load event.");
          return;
        }
        const loaded = json.event as EventDetail & {
          venueCost?: number;
          cateringCost?: number;
          materialsCost?: number;
        };
        setEvent(loaded);
        setForm((prev) => ({
          ...prev,
          name: loaded.name ?? "",
          date: toDateTimeLocal(loaded.date),
          startTime: toDateTimeLocal(loaded.startTime),
          endTime: toDateTimeLocal(loaded.endTime),
          venue: loaded.venue ?? "",
          venueAddress: loaded.venueAddress ?? "",
          capacity: String(loaded.capacity ?? ""),
          expectedRevenue: String(loaded.expectedRevenue ?? 0),
          venueCost: String(loaded.venueCost ?? 0),
          cateringCost: String(loaded.cateringCost ?? 0),
          materialsCost: String(loaded.materialsCost ?? 0),
          totalCost: String(loaded.totalCost ?? 0),
          status: loaded.status ?? "DRAFT",
          notes: loaded.notes ?? "",
          actualRevenue: String(loaded.actualRevenue ?? 0),
          actualCost: String(loaded.totalCost ?? 0),
        }));
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load event.");
        }
      }
    };

    loadEvent();

    return () => controller.abort();
  }, [mode, eventId]);

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
      const payload = {
        name: form.name,
        date: new Date(form.date).toISOString(),
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        venue: form.venue,
        venueAddress: form.venueAddress,
        capacity: Number(form.capacity),
        expectedRevenue: Number(form.expectedRevenue),
        costs: {
          venue: Number(form.venueCost || 0),
          catering: Number(form.cateringCost || 0),
          materials: Number(form.materialsCost || 0),
          total: Number(form.totalCost || 0),
        },
        status: form.status,
        notes: form.notes || null,
      };

      const res = await fetch(
        mode === "create"
          ? "/api/admin/events"
          : `/api/admin/events/${eventId}`,
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
        setError("Failed to save event.");
        setIsLoading(false);
        return;
      }
      setSuccess("Event saved.");
      setIsLoading(false);
    } catch {
      setError("Failed to save event.");
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!eventId) return;
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
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: "DELETE",
        headers,
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to delete event.");
        setIsLoading(false);
        return;
      }
      setSuccess("Event deleted.");
      setEvent((prev) =>
        prev ? { ...prev, deletedAt: new Date().toISOString() } : prev,
      );
      setIsLoading(false);
    } catch {
      setError("Failed to delete event.");
      setIsLoading(false);
    }
  }

  async function handleRestore() {
    if (!eventId) return;
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
      const res = await fetch(`/api/admin/events/${eventId}/restore`, {
        method: "POST",
        headers,
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to restore event.");
        setIsLoading(false);
        return;
      }
      setSuccess("Event restored.");
      setEvent((prev) => (prev ? { ...prev, deletedAt: null } : prev));
      setIsLoading(false);
    } catch {
      setError("Failed to restore event.");
      setIsLoading(false);
    }
  }

  async function handleComplete() {
    if (!eventId) return;
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
      const res = await fetch(`/api/admin/events/${eventId}/complete`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actualRevenue: Number(form.actualRevenue || 0),
          actualCost: Number(form.actualCost || 0),
          notes: form.notes || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to complete event.");
        setIsLoading(false);
        return;
      }
      setSuccess("Event completed.");
      setIsLoading(false);
    } catch {
      setError("Failed to complete event.");
      setIsLoading(false);
    }
  }

  async function handleGenerateMatches() {
    if (!eventId) return;
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setMatchesInfo(null);
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setError("Please sign in again.");
        setIsLoading(false);
        return;
      }
      const res = await fetch(`/api/admin/events/${eventId}/generate-matches`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maxPerApplicant: 5,
          minScore: 60,
          createMatches: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError(json?.error?.message || "Failed to generate matches.");
        setIsLoading(false);
        return;
      }
      setSuccess("Matches generated successfully.");
      setMatchesInfo(
        `Generated ${json.matchesCreated} matches for ${json.applicantsProcessed} applicants (avg score: ${json.avgScore})`,
      );
      setIsLoading(false);
    } catch {
      setError("Failed to generate matches.");
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
      {matchesInfo ? (
        <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-700">
          {matchesInfo}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          placeholder="Event name"
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
        />
        <Input
          type="datetime-local"
          value={form.date}
          onChange={(event) => updateField("date", event.target.value)}
        />
        <Input
          type="datetime-local"
          value={form.startTime}
          onChange={(event) => updateField("startTime", event.target.value)}
        />
        <Input
          type="datetime-local"
          value={form.endTime}
          onChange={(event) => updateField("endTime", event.target.value)}
        />
        <Input
          placeholder="Venue"
          value={form.venue}
          onChange={(event) => updateField("venue", event.target.value)}
        />
        <Input
          placeholder="Venue address"
          value={form.venueAddress}
          onChange={(event) => updateField("venueAddress", event.target.value)}
        />
        <Input
          type="number"
          placeholder="Capacity"
          value={form.capacity}
          onChange={(event) => updateField("capacity", event.target.value)}
        />
        <Select
          value={form.status}
          onChange={(event) => updateField("status", event.target.value)}
        >
          <option value="DRAFT">Draft</option>
          <option value="INVITATIONS_SENT">Invitations Sent</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
        <Input
          type="number"
          placeholder="Expected Revenue (cents)"
          value={form.expectedRevenue}
          onChange={(event) =>
            updateField("expectedRevenue", event.target.value)
          }
        />
        <Input
          type="number"
          placeholder="Venue Cost (cents)"
          value={form.venueCost}
          onChange={(event) => updateField("venueCost", event.target.value)}
        />
        <Input
          type="number"
          placeholder="Catering Cost (cents)"
          value={form.cateringCost}
          onChange={(event) => updateField("cateringCost", event.target.value)}
        />
        <Input
          type="number"
          placeholder="Materials Cost (cents)"
          value={form.materialsCost}
          onChange={(event) => updateField("materialsCost", event.target.value)}
        />
        <Input
          type="number"
          placeholder="Total Cost (cents)"
          value={form.totalCost}
          onChange={(event) => updateField("totalCost", event.target.value)}
        />
        <Input
          type="number"
          placeholder="Actual Revenue (cents)"
          value={form.actualRevenue}
          onChange={(event) => updateField("actualRevenue", event.target.value)}
        />
        <Input
          type="number"
          placeholder="Actual Cost (cents)"
          value={form.actualCost}
          onChange={(event) => updateField("actualCost", event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-navy-soft">Notes</label>
        <Textarea
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
        />
      </div>
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
              onClick={handleGenerateMatches}
              disabled={isLoading}
              className="bg-copper/10 hover:bg-copper/20 text-copper border-copper"
            >
              Generate Matches
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleComplete}
              disabled={isLoading}
            >
              Mark Complete
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={isLoading}
            >
              Soft Delete
            </Button>
            {event?.deletedAt ? (
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
