"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";

type EventItem = {
  id: string;
  name: string;
  date: string;
  venue: string;
  invitationStatus: string;
};

export default function ApplicantEventsList() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/applicant/events?status=UPCOMING", {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((json) => setEvents(json.events ?? []))
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError("Failed to load events.");
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <Card>
      <h2 className="text-lg font-semibold text-navy">Upcoming Events</h2>
      {error ? (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      ) : events.length === 0 ? (
        <p className="mt-2 text-sm text-navy-soft">No events yet.</p>
      ) : (
        <ul className="mt-4 space-y-2 text-sm text-navy-soft">
          {events.map((event) => (
            <li key={event.id} className="flex items-center justify-between">
              <span>
                {event.name} · {new Date(event.date).toLocaleDateString()}
              </span>
              <span className="text-navy-soft">{event.invitationStatus}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
