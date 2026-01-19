"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";

type EventItem = {
  id: string;
  name: string;
  date: string;
  status: string;
};

export default function AdminEventsTable() {
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    fetch("/api/admin/events", { headers: { "x-mock-user-role": "ADMIN" } })
      .then((res) => res.json())
      .then((json) => setEvents(json.events ?? []));
  }, []);

  return (
    <Card>
      <h2 className="text-lg font-semibold text-navy">Events</h2>
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
    </Card>
  );
}
