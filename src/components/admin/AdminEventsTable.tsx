"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type EventItem = {
  id: string;
  name: string;
  date: string;
  status: string;
  capacity?: number;
};

export default function AdminEventsTable() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    const controller = new AbortController();

    const loadEvents = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          return;
        }

        const res = await fetch(`/api/admin/events?page=${page}`, {
          headers,
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load events.");
          return;
        }
        setEvents(json.events ?? []);
        setPages(json.pagination?.pages ?? 1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load events.");
        }
      }
    };

    loadEvents();

    return () => controller.abort();
  }, [page]);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy">Events</h2>
        <Link
          href="/admin/events/new"
          className="text-xs font-semibold text-copper hover:underline"
        >
          New Event
        </Link>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <Table className="min-w-full">
            <thead>
              <tr className="border-b text-xs uppercase text-slate-400">
                <th className="py-2 pr-6 text-left">Event</th>
                <th className="py-2 px-6 text-left">Date</th>
                <th className="py-2 px-6 text-left">Status</th>
                <th className="py-2 pl-6 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-b text-sm text-navy-soft">
                  <td className="py-2 pr-6 whitespace-nowrap">{event.name}</td>
                  <td className="py-2 px-6 whitespace-nowrap">
                    {new Date(event.date).toLocaleDateString()}
                  </td>
                  <td className="py-2 px-6 whitespace-nowrap">
                    {event.status}
                  </td>
                  <td className="py-2 pl-6 whitespace-nowrap">
                    <Link
                      href={`/admin/events/${event.id}`}
                      className="text-xs font-medium text-copper hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
      <div className="mt-4 flex items-center justify-between text-sm text-navy-soft">
        <span>
          Page {page} of {pages}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1}
          >
            Prev
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPage((prev) => Math.min(pages, prev + 1))}
            disabled={page >= pages}
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}
