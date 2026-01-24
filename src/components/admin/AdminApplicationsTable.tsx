"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type ApplicationItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  applicationStatus: string;
  screeningStatus?: string;
};

export default function AdminApplicationsTable() {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    const controller = new AbortController();

    const loadApplications = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          return;
        }

        const res = await fetch(`/api/admin/applications?page=${page}`, {
          headers,
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load applications.");
          return;
        }
        setApplications(json.applications ?? []);
        setPages(json.pagination?.pages ?? 1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load applications.");
        }
      }
    };

    loadApplications();

    return () => controller.abort();
  }, [page]);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy">Applications</h2>
        <Link
          href="/admin/applications/new"
          className="text-xs font-semibold text-copper hover:underline"
        >
          New Application
        </Link>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <Table className="min-w-full">
            <thead>
              <tr className="border-b text-xs uppercase text-slate-400">
                <th className="py-2 text-left">Applicant</th>
                <th className="py-2 text-left">Email</th>
                <th className="py-2 text-left">Status</th>
                <th className="py-2 text-left">Screening</th>
                <th className="py-2 text-left">Waitlist</th>
                <th className="py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-b text-sm text-navy-soft">
                  <td className="py-2 whitespace-nowrap">
                    {app.firstName} {app.lastName}
                  </td>
                  <td className="py-2 whitespace-nowrap">{app.email}</td>
                  <td className="py-2 whitespace-nowrap">
                    {app.applicationStatus}
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    {app.screeningStatus ?? "N/A"}
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    <button
                      type="button"
                      className="text-xs font-medium text-copper hover:underline"
                      onClick={async () => {
                        try {
                          const isWaitlisted = [
                            "WAITLIST",
                            "WAITLIST_INVITED",
                          ].includes(app.applicationStatus);
                          const enableWaitlist = !isWaitlisted;
                          const headers = await getAuthHeaders();
                          if (!headers) {
                            setError("Please sign in again.");
                            return;
                          }
                          const response = await fetch(
                            `/api/admin/applications/${app.id}/waitlist`,
                            {
                              method: "POST",
                              headers: {
                                ...headers,
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({ enabled: enableWaitlist }),
                            },
                          );

                          if (!response.ok) {
                            setError("Failed to update waitlist status.");
                            return;
                          }

                          const data = await response.json();
                          const nextStatus =
                            data?.applicant?.applicationStatus ??
                            (enableWaitlist ? "WAITLIST" : "SUBMITTED");
                          setError(null);
                          setApplications((prev) =>
                            prev.map((item) =>
                              item.id === app.id
                                ? {
                                    ...item,
                                    applicationStatus: nextStatus,
                                  }
                                : item,
                            ),
                          );
                        } catch {
                          setError("Failed to update waitlist status.");
                        }
                      }}
                    >
                      {["WAITLIST", "WAITLIST_INVITED"].includes(
                        app.applicationStatus,
                      )
                        ? "Remove"
                        : "Add"}
                    </button>
                  </td>
                  <td className="py-2 whitespace-nowrap">
                    <Link
                      href={`/admin/applications/${app.id}`}
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
