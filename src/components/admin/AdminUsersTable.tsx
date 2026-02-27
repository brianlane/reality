"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";
import { formatDateTime } from "@/lib/admin/format";
import PaginationControls from "@/components/admin/PaginationControls";

type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  deletedAt: string | null;
  applicant?: {
    applicationStatus: string;
  } | null;
  authCreatedAt: string | null;
  lastSignIn: string | null;
  emailConfirmed: string | null;
  supabaseId: string | null;
};

type Stats = {
  total: number;
  active: number;
  applicants: number;
  admins: number;
};

function getTimeSince(dateString: string | null): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

export default function AdminUsersTable() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active: 0,
    applicants: 0,
    admins: 0,
  });
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [filter, setFilter] = useState<"all" | "applicants">("all");
  const [search, setSearch] = useState("");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadUsers = async () => {
      try {
        setLoading(true);
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          setLoading(false);
          return;
        }
        const roleParam = filter === "applicants" ? "&role=APPLICANT" : "";
        const searchParam = search
          ? `&search=${encodeURIComponent(search)}`
          : "";
        const res = await fetch(
          `/api/admin/users?page=${page}&includeDeleted=${includeDeleted}${roleParam}${searchParam}`,
          { headers, signal: controller.signal },
        );
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load users.");
          setLoading(false);
          return;
        }
        setUsers(json.users ?? []);
        setPages(json.pagination?.pages ?? 1);
        setStats(
          json.stats ?? {
            total: json.pagination?.total ?? 0,
            active: 0,
            applicants: 0,
            admins: 0,
          },
        );
        setLoading(false);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load users.");
          setLoading(false);
        }
      }
    };

    loadUsers();

    return () => controller.abort();
  }, [page, includeDeleted, filter, search]);

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="text-sm text-navy-soft">Total Users</div>
          <div className="mt-1 text-2xl font-semibold text-navy">
            {stats.total}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-navy-soft">Ever Logged In</div>
          <div className="mt-1 text-2xl font-semibold text-navy">
            {stats.active}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-navy-soft">Applicants</div>
          <div className="mt-1 text-2xl font-semibold text-navy">
            {stats.applicants}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-navy-soft">Admins</div>
          <div className="mt-1 text-2xl font-semibold text-navy">
            {stats.admins}
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search name or email…"
          className="h-9 w-56 text-sm"
          onChange={(e) => {
            const val = e.target.value;
            if (searchTimeout.current) clearTimeout(searchTimeout.current);
            searchTimeout.current = setTimeout(() => {
              setSearch(val);
              setPage(1);
            }, 300);
          }}
        />
        <button
          onClick={() => {
            setFilter("all");
            setPage(1);
          }}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${filter === "all" ? "bg-navy text-white" : "bg-slate-100 text-navy hover:bg-slate-200"}`}
        >
          All Users
        </button>
        <button
          onClick={() => {
            setFilter("applicants");
            setPage(1);
          }}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${filter === "applicants" ? "bg-navy text-white" : "bg-slate-100 text-navy hover:bg-slate-200"}`}
        >
          Applicants Only
        </button>
        <label className="ml-auto flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 text-sm text-navy">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={() => setIncludeDeleted((prev) => !prev)}
          />
          Show deleted
        </label>
      </div>

      {/* Table */}
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy">User Details</h2>
          <Link
            href="/admin/users/new"
            className="text-xs font-semibold text-copper hover:underline"
          >
            New User
          </Link>
        </div>
        {error ? (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        ) : loading ? (
          <p className="mt-4 text-sm text-navy-soft">Loading users...</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <Table className="min-w-full">
              <thead>
                <tr className="border-b text-xs uppercase text-slate-400">
                  <th className="py-2 pr-6 text-left">User</th>
                  <th className="py-2 px-6 text-left">Email</th>
                  <th className="py-2 px-6 text-left">Role</th>
                  <th className="py-2 px-6 text-left">Status</th>
                  <th className="py-2 px-6 text-left">Last Sign In</th>
                  <th className="py-2 px-6 text-left">Created</th>
                  <th className="py-2 px-6 text-left">Email Verified</th>
                  <th className="py-2 px-6 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="py-8 text-center text-sm text-navy-soft"
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="text-sm hover:bg-slate-50">
                      <td className="py-3 pr-6">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="font-medium text-navy hover:text-copper"
                        >
                          {user.firstName} {user.lastName}
                        </Link>
                      </td>
                      <td className="py-3 px-6 text-navy-soft">{user.email}</td>
                      <td className="py-3 px-6">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            user.role === "ADMIN"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-6">
                        {user.deletedAt ? (
                          <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                            Deleted
                          </span>
                        ) : user.applicant?.applicationStatus ? (
                          <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            {user.applicant.applicationStatus}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-6">
                        {user.lastSignIn ? (
                          <div className="flex flex-col">
                            <span className="text-navy">
                              {getTimeSince(user.lastSignIn)}
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatDateTime(user.lastSignIn) ?? "Never"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">Never</span>
                        )}
                      </td>
                      <td className="py-3 px-6 text-navy-soft">
                        {formatDateTime(user.createdAt) ?? "N/A"}
                      </td>
                      <td className="py-3 px-6">
                        {user.emailConfirmed ? (
                          <span className="text-green-600">✓ Verified</span>
                        ) : (
                          <span className="text-slate-400">Not verified</span>
                        )}
                      </td>
                      <td className="py-3 px-6">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="text-xs font-medium text-copper hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        )}
        <PaginationControls
          page={page}
          pages={pages}
          total={stats.total}
          onPageChange={setPage}
        />
      </Card>
    </div>
  );
}
