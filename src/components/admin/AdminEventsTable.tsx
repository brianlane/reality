"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type EventItem = {
  id: string;
  name: string;
  date: string;
  status: string;
};

export default function AdminEventsTable() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadEvents = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          return;
        }

        const res = await fetch("/api/admin/events", {
          headers,
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load events.");
          return;
        }
        setEvents(json.events ?? []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load events.");
        }
      }
    };

    loadEvents();

    return () => controller.abort();
  }, []);

  return (
    <Card>
      <h2 className="text-lg font-semibold text-navy">Events</h2>
      {error ? (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      ) : (
        <Table className="mt-4">
          <thead>
            <tr className="border-b text-xs uppercase text-slate-400">
              <th className="py-2 text-left">Event</th>
              <th className="py-2 text-left">Date</th>
              <th className="py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} className="border-b text-sm text-navy-soft">
                <td className="py-2">{event.name}</td>
                <td className="py-2">
                  {new Date(event.date).toLocaleDateString()}
                </td>
                <td className="py-2">{event.status}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
