"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";
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

function formatDate(dateVal: string | Date | null | undefined) {
  if (!dateVal) return "N/A";
  const parsed = new Date(dateVal);
  if (Number.isNaN(parsed.getTime())) return "N/A";
  const date = parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = parsed.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${date} ${time}`;
}

function formatDuration(startVal: string | null | undefined, endVal: string | null | undefined) {
  if (!startVal || !endVal) return "N/A";
  const start = new Date(startVal);
  const end = new Date(endVal);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "N/A";
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return "N/A";
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  if (days > 0) return `${days}d ${remHours}h`;
  return `${hours}h ${minutes}m`;
}

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

        const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
        const res = await fetch(`/api/admin/applications?page=${page}${searchParam}`, {
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
          <Link href="/admin/applications/new" className="text-xs font-semibold text-copper hover:underline whitespace-nowrap">
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
                <th className="py-2 px-6 text-left">Questionnaire Duration</th>
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
                    {formatDate(app.submittedAt)}
                  </td>
                  <td className="py-2 px-6 whitespace-nowrap text-xs">
                    {formatDate(app.questionnaireStartedAt)}
                  </td>
                  <td className="py-2 px-6 whitespace-nowrap text-xs text-slate-500">
                    {formatDuration(app.questionnaireStartedAt, app.reviewedAt)}
                  </td>
                  <td className="py-2 px-6 whitespace-nowrap text-xs">
                    {formatDate(app.reviewedAt)}
                  </td>
                  <td className="py-2 px-6 whitespace-nowrap text-xs text-slate-500">
                    {formatDuration(app.submittedAt, app.reviewedAt)}
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
      <PaginationControls page={page} pages={pages} total={total} onPageChange={setPage} />
    </Card>
  );
}
