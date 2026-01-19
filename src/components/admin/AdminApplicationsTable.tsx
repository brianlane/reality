"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";

type ApplicationItem = {
  id: string;
  firstName: string;
  lastName: string;
  applicationStatus: string;
};

export default function AdminApplicationsTable() {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/admin/applications", { signal: controller.signal })
      .then((res) => res.json())
      .then((json) => setApplications(json.applications ?? []))
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError("Failed to load applications.");
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <Card>
      <h2 className="text-lg font-semibold text-navy">Applications</h2>
      {error ? (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      ) : (
        <Table className="mt-4">
          <thead>
            <tr className="border-b text-xs uppercase text-slate-400">
              <th className="py-2 text-left">Applicant</th>
              <th className="py-2 text-left">Status</th>
              <th className="py-2 text-left">Waitlist</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => (
              <tr key={app.id} className="border-b text-sm text-navy-soft">
                <td className="py-2">
                  {app.firstName} {app.lastName}
                </td>
                <td className="py-2">{app.applicationStatus}</td>
                <td className="py-2">
                  <button
                    type="button"
                    className="text-xs font-medium text-copper hover:underline"
                    onClick={async () => {
                      const enableWaitlist =
                        app.applicationStatus !== "WAITLIST";
                      const response = await fetch(
                        `/api/admin/applications/${app.id}/waitlist`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ enabled: enableWaitlist }),
                        },
                      );

                      if (!response.ok) {
                        setError("Failed to update waitlist status.");
                        return;
                      }

                      setApplications((prev) =>
                        prev.map((item) =>
                          item.id === app.id
                            ? {
                                ...item,
                                applicationStatus: enableWaitlist
                                  ? "WAITLIST"
                                  : "SUBMITTED",
                              }
                            : item,
                        ),
                      );
                    }}
                  >
                    {app.applicationStatus === "WAITLIST" ? "Remove" : "Add"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
