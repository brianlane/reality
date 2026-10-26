"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const POST_DATE_OUTCOMES = new Set([
  "FIRST_DATE_COMPLETED",
  "SECOND_DATE",
  "DATING",
  "RELATIONSHIP",
  "ENGAGED",
  "MARRIED",
  "NO_CONNECTION",
  "GHOSTED",
]);

/**
 * Structured post-date debrief form. Shown on the match detail page once a
 * first date has happened. Captures rating + feedback into MatchAnalytics
 * and the day-30 follow-up. The conversational agent-led debrief arrives in
 * a later PR; this is the structured capture layer.
 */
export function AgentDebriefForm({
  matchId,
  outcome,
}: {
  matchId: string;
  outcome: string;
}) {
  const [rating, setRating] = useState<number>(5);
  const [feedback, setFeedback] = useState("");
  const [dateHappened, setDateHappened] = useState(true);
  const [wouldSeeAgain, setWouldSeeAgain] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!POST_DATE_OUTCOMES.has(outcome)) {
    return null;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/applicant/matches/${matchId}/debrief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          feedback: feedback.trim() || undefined,
          dateHappened,
          wouldSeeAgain,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message ?? "Failed to submit debrief");
      }
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit debrief");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card>
        <p className="text-sm text-green-700 font-medium">
          Thanks — your debrief is saved. It helps your agent understand what
          worked.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold text-navy">How did the date go?</h2>
      <p className="mt-1 text-sm text-navy-soft">
        Your debrief feeds your agent&apos;s understanding of your chemistry —
        and stays private to you.
      </p>

      <form onSubmit={submit} className="mt-4 space-y-4">
        <div>
          <label
            className="text-sm font-medium text-navy"
            htmlFor="debrief-rating"
          >
            Rating
          </label>
          <select
            id="debrief-rating"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            disabled={submitting}
            className="mt-1 block w-32 rounded-md border border-stone-300 px-3 py-2 text-sm"
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} / 5
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            className="text-sm font-medium text-navy"
            htmlFor="debrief-feedback"
          >
            What stood out? (optional)
          </label>
          <Textarea
            id="debrief-feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={submitting}
            rows={3}
            placeholder="Chemistry, conversation, anything you noticed…"
            className="mt-1"
          />
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={dateHappened}
              onChange={(e) => setDateHappened(e.target.checked)}
              disabled={submitting}
              className="h-4 w-4"
            />
            The date happened
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={wouldSeeAgain}
              onChange={(e) => setWouldSeeAgain(e.target.checked)}
              disabled={submitting}
              className="h-4 w-4"
            />
            I&apos;d like to see them again
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Submitting…" : "Submit debrief"}
        </Button>
      </form>
    </Card>
  );
}
