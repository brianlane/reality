"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";
import { formatDateTime, formatDuration } from "@/lib/admin/format";
import PaginationControls from "@/components/admin/PaginationControls";

type ApplicationItem = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  applicationStatus: string;
  screeningStatus?: string;
  submittedAt?: string | null;
  questionnaireStartedAt?: string | null;
  reviewedAt?: string | null;
};

export default function AdminApplicationsTable() {
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadApplications = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          return;
        }

        const searchParam = search
          ? `&search=${encodeURIComponent(search)}`
          : "";
        const res = await fetch(
          `/api/admin/applications?page=${page}${searchParam}`,
          {
            headers,
            signal: controller.signal,
          },
        );
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load applications.");
          return;
        }
        setApplications(json.applications ?? []);
        setPages(json.pagination?.pages ?? 1);
        setTotal(json.pagination?.total ?? 0);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load applications.");
        }
      }
    };

    loadApplications();

    return () => controller.abort();
  }, [page, search]);

  return (
    <Card>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-navy">Applications</h2>
        <div className="flex items-center gap-3 ml-auto">
          <Input
            placeholder="Search name or email…"
            className="h-8 w-48 text-sm"
            onChange={(e) => {
              const val = e.target.value;
              if (searchTimeout.current) clearTimeout(searchTimeout.current);
              searchTimeout.current = setTimeout(() => {
                setSearch(val);
                setPage(1);
              }, 300);
            }}
          />
          <Link
            href="/admin/applications/new"
            className="text-xs font-semibold text-copper hover:underline whitespace-nowrap"
          >
            New Application
          </Link>
        </div>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <Table className="min-w-[1400px]">
            <thead>
              <tr className="border-b text-xs uppercase text-slate-400">
                <th className="py-2 pr-6 text-left">Applicant</th>
                <th className="py-2 px-6 text-left">Email</th>
                <th className="py-2 px-6 text-left">Status</th>
                <th className="py-2 px-6 text-left">Screening</th>
                <th className="py-2 px-6 text-left">Submitted</th>
                <th className="py-2 px-6 text-left">Questionnaire Started</th>
                <th className="py-2 px-6 text-left">Q Started → Reviewed</th>
                <th className="py-2 px-6 text-left">Reviewed</th>
                <th className="py-2 px-6 text-left">Total Duration</th>
                <th className="py-2 pl-6 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-b text-sm text-navy-soft">
                  <td className="py-2 pr-6 whitespace-nowrap">
                    {app.firstName} {app.lastName}
                  </td>
                  <td className="py-2 px-6 whitespace-nowrap">{app.email}</td>
                  <td className="py-2 px-6 whitespace-nowrap">
                    {app.applicationStatus}
                  </td>
                  <td className="py-2 px-6 whitespace-nowrap">
                    {app.screeningStatus ?? "N/A"}
                  </td>
                  <td className="py-2 px-6 whitespace-nowrap text-xs">
                    {formatDateTime(app.submittedAt) ?? "N/A"}
                  </td>
                  <td className="py-2 px-6 whitespace-nowrap text-xs">
                    {formatDateTime(app.questionnaireStartedAt) ?? "N/A"}
                  </td>
                  <td className="py-2 px-6 whitespace-nowrap text-xs text-slate-500">
                    {formatDuration(
                      app.questionnaireStartedAt,
                      app.reviewedAt,
                    ) ?? "N/A"}
                  </td>
                  <td className="py-2 px-6 whitespace-nowrap text-xs">
                    {formatDateTime(app.reviewedAt) ?? "N/A"}
                  </td>
                  <td className="py-2 px-6 whitespace-nowrap text-xs text-slate-500">
                    {formatDuration(app.submittedAt, app.reviewedAt) ?? "N/A"}
                  </td>
                  <td className="py-2 pl-6 whitespace-nowrap">
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
      <PaginationControls
        page={page}
        pages={pages}
        total={total}
        onPageChange={setPage}
      />
    </Card>
  );
}
