"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ConsentState = {
  dimensionToggles: Record<string, boolean>;
  pouchReviewMode: boolean;
  agentPaused: boolean;
  sharableDimensions: string[];
};

const DIMENSION_LABELS: Record<string, string> = {
  attachment: "Attachment style",
  conflict: "Conflict style & repair",
  values: "Values",
  lifeArchitecture: "Life plans (kids, location, career)",
  readiness: "Relationship readiness",
  family: "Family background",
};

/**
 * Applicant-facing consent controls for the agent-to-agent compatibility
 * feature. Lets the principal decide what their agent may share, require
 * per-exchange review, or pause the agent entirely (kill switch).
 */
export function AgentConsentPanel() {
  const [consent, setConsent] = useState<ConsentState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/applicant/agent/consent")
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load consent settings");
        const data = await res.json();
        setConsent({
          dimensionToggles: data.dimensionToggles ?? {},
          pouchReviewMode: data.pouchReviewMode ?? false,
          agentPaused: data.agentPaused ?? false,
          sharableDimensions: data.sharableDimensions ?? [],
        });
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  async function save(next: ConsentState) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/applicant/agent/consent", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dimensionToggles: next.dimensionToggles,
          pouchReviewMode: next.pouchReviewMode,
          agentPaused: next.agentPaused,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error?.message ?? "Failed to save consent settings",
        );
      }
      setConsent(next);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function update(patch: Partial<ConsentState>) {
    if (!consent) return;
    void save({ ...consent, ...patch });
  }

  if (error && !consent) {
    return (
      <Card className="p-6">
        <p className="text-sm text-red-600">{error}</p>
      </Card>
    );
  }

  if (!consent) {
    return (
      <Card className="p-6">
        <p className="text-sm text-muted-foreground">
          Loading agent privacy settings…
        </p>
      </Card>
    );
  }

  const dims =
    consent.sharableDimensions.length > 0
      ? consent.sharableDimensions
      : Object.keys(DIMENSION_LABELS);

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Your agent&apos;s privacy</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your AI agent only ever shares structured summaries with another agent
          — never your stories, messages, or details. Control what it may share
          here.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <fieldset disabled={saving} className="space-y-3">
        <legend className="text-sm font-medium mb-1">
          Dimensions your agent may share
        </legend>
        {dims.map((dim) => {
          const enabled = consent.dimensionToggles[dim] !== false;
          return (
            <label key={dim} className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) =>
                  update({
                    dimensionToggles: {
                      ...consent.dimensionToggles,
                      [dim]: e.target.checked,
                    },
                  })
                }
                className="h-4 w-4"
              />
              {DIMENSION_LABELS[dim] ?? dim}
            </label>
          );
        })}
      </fieldset>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={consent.pouchReviewMode}
          disabled={saving}
          onChange={(e) => update({ pouchReviewMode: e.target.checked })}
          className="h-4 w-4 mt-0.5"
        />
        <span>
          <span className="font-medium">Review before sharing.</span>{" "}
          <span className="text-muted-foreground">
            Show me each summary before my agent shares it with another agent.
          </span>
        </span>
      </label>

      <div className="border-t pt-4">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={consent.agentPaused}
            disabled={saving}
            onChange={(e) => update({ agentPaused: e.target.checked })}
            className="h-4 w-4 mt-0.5"
          />
          <span>
            <span className="font-medium">Pause my agent.</span>{" "}
            <span className="text-muted-foreground">
              While paused, your agent shares nothing with anyone.
            </span>
          </span>
        </label>
      </div>

      <div className="text-xs text-muted-foreground">
        {saving
          ? "Saving…"
          : savedAt
            ? `Saved at ${savedAt}`
            : "Changes save automatically."}
      </div>

      <Button
        variant="outline"
        disabled={saving}
        onClick={() => consent && void save(consent)}
      >
        Refresh
      </Button>
    </Card>
  );
}
