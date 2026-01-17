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

  useEffect(() => {
    fetch("/api/applicant/events")
      .then((res) => res.json())
      .then((json) => setEvents(json.events ?? []));
  }, []);

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900">Upcoming Events</h2>
      {events.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No events yet.</p>
      ) : (
        <ul className="mt-4 space-y-2 text-sm text-slate-600">
          {events.map((event) => (
            <li key={event.id} className="flex items-center justify-between">
              <span>
                {event.name} · {new Date(event.date).toLocaleDateString()}
              </span>
              <span className="text-slate-500">{event.invitationStatus}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
