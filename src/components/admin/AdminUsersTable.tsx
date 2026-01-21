"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type UserRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  deletedAt: string | null;
};

export default function AdminUsersTable() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadUsers = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          return;
        }
        const res = await fetch(
          `/api/admin/users?page=${page}&includeDeleted=${includeDeleted}`,
          { headers, signal: controller.signal },
        );
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load users.");
          return;
        }
        setUsers(json.users ?? []);
        setPages(json.pagination?.pages ?? 1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load users.");
        }
      }
    };

    loadUsers();

    return () => controller.abort();
  }, [page, includeDeleted]);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy">Users</h2>
        <Link
          href="/admin/users/new"
          className="text-xs font-semibold text-copper hover:underline"
        >
          New User
        </Link>
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-navy-soft">
        <input
          type="checkbox"
          checked={includeDeleted}
          onChange={() => setIncludeDeleted((prev) => !prev)}
        />
        Show deleted
      </label>
      {error ? (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      ) : (
        <Table className="mt-4">
          <thead>
            <tr className="border-b text-xs uppercase text-slate-400">
              <th className="py-2 text-left">Name</th>
              <th className="py-2 text-left">Email</th>
              <th className="py-2 text-left">Role</th>
              <th className="py-2 text-left">Status</th>
              <th className="py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b text-sm text-navy-soft">
                <td className="py-2">
                  {user.firstName} {user.lastName}
                </td>
                <td className="py-2">{user.email}</td>
                <td className="py-2">{user.role}</td>
                <td className="py-2">
                  {user.deletedAt ? "Deleted" : "Active"}
                </td>
                <td className="py-2">
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="text-xs font-medium text-copper hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
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
