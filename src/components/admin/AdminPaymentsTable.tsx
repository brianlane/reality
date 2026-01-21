"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type PaymentRow = {
  id: string;
  applicant: { name: string; email: string };
  event?: { name: string };
  type: string;
  amount: number;
  status: string;
  deletedAt: string | null;
};

export default function AdminPaymentsTable() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadPayments = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          return;
        }
        const res = await fetch(
          `/api/admin/payments?page=${page}&includeDeleted=${includeDeleted}`,
          { headers, signal: controller.signal },
        );
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load payments.");
          return;
        }
        setPayments(json.payments ?? []);
        setPages(json.pagination?.pages ?? 1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load payments.");
        }
      }
    };

    loadPayments();

    return () => controller.abort();
  }, [page, includeDeleted]);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy">Payments</h2>
        <Link
          href="/admin/payments/new"
          className="text-xs font-semibold text-copper hover:underline"
        >
          New Payment
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
              <th className="py-2 text-left">Applicant</th>
              <th className="py-2 text-left">Type</th>
              <th className="py-2 text-left">Amount</th>
              <th className="py-2 text-left">Status</th>
              <th className="py-2 text-left">Event</th>
              <th className="py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b text-sm text-navy-soft">
                <td className="py-2">
                  <div>{payment.applicant?.name ?? "N/A"}</div>
                  <div className="text-xs text-navy-soft">
                    {payment.applicant?.email ?? ""}
                  </div>
                </td>
                <td className="py-2">{payment.type}</td>
                <td className="py-2">${(payment.amount / 100).toFixed(2)}</td>
                <td className="py-2">{payment.status}</td>
                <td className="py-2">{payment.event?.name ?? "N/A"}</td>
                <td className="py-2">
                  <Link
                    href={`/admin/payments/${payment.id}`}
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
