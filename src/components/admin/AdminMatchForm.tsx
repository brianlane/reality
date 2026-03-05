"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";
import { CITIES } from "@/lib/locations";
import { formatDateOnly } from "@/lib/admin/format";

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

type EventOption = {
  id: string;
  name: string;
  date: string;
  location: string | null;
  status: string;
};

type ApplicantOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  location: string | null;
  applicationStatus: string;
};

// ── EventCombobox ─────────────────────────────────────────────────────────────

function EventCombobox({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EventOption[]>([]);
  const [selected, setSelected] = useState<EventOption | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Debounced server-side search (no pre-load limit)
  useEffect(() => {
    if (selected) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const headers = await getAuthHeaders();
        if (!headers) return;
        const params = new URLSearchParams({ limit: "20", page: "1" });
        if (query.trim()) params.set("name", query.trim());
        const res = await fetch(`/api/admin/events?${params}`, {
          headers,
          signal: controller.signal,
        });
        if (res.ok) {
          const json = await res.json();
          setResults(json.events ?? []);
          setOpen(true);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected]);

  // Sync external clear
  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      setQuery("");
      setResults([]);
    }
  }, [selectedId]);

  function handleSelect(ev: EventOption) {
    setSelected(ev);
    onSelect(ev.id);
    setQuery("");
    setOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    setSelected(null);
    onSelect("");
    setQuery("");
    setResults([]);
  }

  return (
    <div ref={containerRef} className="relative md:col-span-2">
      <label className="block text-xs font-medium text-slate-500 mb-1">
        Event
      </label>
      {selected ? (
        <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          <span className="flex-1 font-medium">{selected.name}</span>
          <span className="shrink-0 text-xs text-slate-400">
            {selected.location ?? "—"}
          </span>
          <span className="shrink-0 text-xs text-slate-400">
            {formatDateOnly(selected.date) ?? "—"}
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="ml-1 text-slate-400 hover:text-slate-700"
            aria-label="Clear event"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="relative">
          <Input
            placeholder="Search events by name…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            autoComplete="off"
          />
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              …
            </span>
          )}
        </div>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {results.map((ev) => (
            <button
              key={ev.id}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
              onMouseDown={() => handleSelect(ev)}
            >
              <span className="flex-1 font-medium">{ev.name}</span>
              <span className="shrink-0 text-xs text-slate-400">
                {ev.location ?? "—"}
              </span>
              <span className="shrink-0 text-xs text-slate-400">
                {formatDateOnly(ev.date) ?? "—"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ApplicantCombobox ─────────────────────────────────────────────────────────

function ApplicantCombobox({
  label,
  selectedId,
  onSelect,
  locationFilter,
  excludeId,
}: {
  label: string;
  selectedId: string;
  onSelect: (id: string) => void;
  locationFilter: string;
  excludeId: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ApplicantOption[]>([]);
  const [selected, setSelected] = useState<ApplicantOption | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Debounced search with AbortController to discard stale responses
  useEffect(() => {
    if (selected || !query.trim()) {
      if (!query.trim()) {
        setResults([]);
        setOpen(false);
      }
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const headers = await getAuthHeaders();
        if (!headers) return;
        const params = new URLSearchParams({
          search: query.trim(),
          limit: "15",
          status: "APPROVED",
        });
        if (locationFilter) params.set("location", locationFilter);
        const res = await fetch(`/api/admin/applications?${params}`, {
          headers,
          signal: controller.signal,
        });
        if (res.ok) {
          const json = await res.json();
          setResults(json.applications ?? []);
          setOpen(true);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, locationFilter, selected]);

  // Sync external clear (e.g., form reset)
  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      setQuery("");
      setResults([]);
    }
  }, [selectedId]);

  function handleSelect(option: ApplicantOption) {
    setSelected(option);
    setQuery("");
    setOpen(false);
    onSelect(option.id);
  }

  function handleClear() {
    setSelected(null);
    setQuery("");
    setResults([]);
    onSelect("");
  }

  const visible = results.filter((r) => r.id !== excludeId);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-medium text-slate-500 mb-1">
        {label}
      </label>
      {selected ? (
        <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
          <span className="flex-1 font-medium">
            {selected.firstName} {selected.lastName}
          </span>
          <span className="max-w-[120px] truncate text-xs text-slate-400">
            {selected.location ?? "—"}
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="ml-1 text-base leading-none text-slate-400 hover:text-slate-700"
            aria-label="Clear selection"
          >
            ×
          </button>
        </div>
      ) : (
        <div className="relative">
          <Input
            placeholder={`Search ${label.toLowerCase()} by name…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => visible.length > 0 && setOpen(true)}
            autoComplete="off"
          />
          {loading && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              …
            </span>
          )}
        </div>
      )}
      {open && visible.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {visible.map((option) => (
            <button
              key={option.id}
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50"
              onMouseDown={() => handleSelect(option)}
            >
              <span className="flex-1 font-medium">
                {option.firstName} {option.lastName}
              </span>
              <span className="shrink-0 text-xs text-slate-400">
                {option.location ?? "—"}
              </span>
              <span
                className={`shrink-0 text-xs ${
                  option.applicationStatus === "APPROVED"
                    ? "text-green-600"
                    : "text-slate-400"
                }`}
              >
                {option.applicationStatus}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── AdminMatchForm ─────────────────────────────────────────────────────────────

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

  // Create-mode state
  const [locationFilter, setLocationFilter] = useState("");

  // Load existing match for edit mode
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

  async function handleHardDelete() {
    if (!matchId) return;
    if (
      !window.confirm("Permanently delete this match? This cannot be undone.")
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
      const res = await fetch(`/api/admin/matches/${matchId}/hard-delete`, {
        method: "DELETE",
        headers,
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to permanently delete match.");
        setIsLoading(false);
        return;
      }
      setSuccess("Match permanently deleted.");
      setIsLoading(false);
    } catch {
      setError("Failed to permanently delete match.");
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
            {/* Location filter — scopes the applicant / partner searches */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Location Filter
              </label>
              <Select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              >
                <option value="">All Locations</option>
                {CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </Select>
            </div>

            {/* Event combobox */}
            <EventCombobox
              selectedId={form.eventId}
              onSelect={(id) => updateField("eventId", id)}
            />

            {/* Applicant + partner comboboxes */}
            <ApplicantCombobox
              label="Applicant"
              selectedId={form.applicantId}
              onSelect={(id) => updateField("applicantId", id)}
              locationFilter={locationFilter}
              excludeId={form.partnerId}
            />
            <ApplicantCombobox
              label="Partner"
              selectedId={form.partnerId}
              onSelect={(id) => updateField("partnerId", id)}
              locationFilter={locationFilter}
              excludeId={form.applicantId}
            />

            {/* Match type */}
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
            <Button
              type="button"
              variant="outline"
              onClick={handleHardDelete}
              disabled={isLoading}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              Hard Delete
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
