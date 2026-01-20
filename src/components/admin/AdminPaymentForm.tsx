"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type AdminPaymentFormProps = {
  paymentId?: string;
  mode: "create" | "edit";
};

type PaymentDetail = {
  id: string;
  applicantId: string;
  eventId: string | null;
  type: string;
  amount: number;
  status: string;
  stripePaymentId: string | null;
  stripeInvoiceId: string | null;
  deletedAt: string | null;
};

export default function AdminPaymentForm({
  paymentId,
  mode,
}: AdminPaymentFormProps) {
  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [form, setForm] = useState({
    applicantId: "",
    eventId: "",
    type: "APPLICATION_FEE",
    amount: "",
    status: "PENDING",
    stripePaymentId: "",
    stripeInvoiceId: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (mode !== "edit" || !paymentId) return;
    const controller = new AbortController();

    const loadPayment = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          return;
        }
        const res = await fetch(
          `/api/admin/payments/${paymentId}?includeDeleted=true`,
          {
            headers,
            signal: controller.signal,
          },
        );
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load payment.");
          return;
        }
        const loaded = json.payment as PaymentDetail;
        setPayment(loaded);
        setForm({
          applicantId: loaded.applicantId,
          eventId: loaded.eventId ?? "",
          type: loaded.type,
          amount: String(loaded.amount),
          status: loaded.status,
          stripePaymentId: loaded.stripePaymentId ?? "",
          stripeInvoiceId: loaded.stripeInvoiceId ?? "",
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load payment.");
        }
      }
    };

    loadPayment();

    return () => controller.abort();
  }, [mode, paymentId]);

  function updateField(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setError("Please sign in again.");
        setIsLoading(false);
        return;
      }
      const res = await fetch(
        mode === "create"
          ? "/api/admin/payments"
          : `/api/admin/payments/${paymentId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            applicantId: form.applicantId,
            eventId: form.eventId || null,
            type: form.type,
            amount: Number(form.amount),
            status: form.status,
            stripePaymentId: form.stripePaymentId || null,
            stripeInvoiceId: form.stripeInvoiceId || null,
          }),
        },
      );
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to save payment.");
        setIsLoading(false);
        return;
      }
      setSuccess("Payment saved.");
      setIsLoading(false);
    } catch {
      setError("Failed to save payment.");
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!paymentId) return;
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setError("Please sign in again.");
        setIsLoading(false);
        return;
      }
      const res = await fetch(`/api/admin/payments/${paymentId}`, {
        method: "DELETE",
        headers,
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to delete payment.");
        setIsLoading(false);
        return;
      }
      setSuccess("Payment deleted.");
      setPayment((prev) =>
        prev ? { ...prev, deletedAt: new Date().toISOString() } : prev,
      );
      setIsLoading(false);
    } catch {
      setError("Failed to delete payment.");
      setIsLoading(false);
    }
  }

  async function handleRestore() {
    if (!paymentId) return;
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setError("Please sign in again.");
        setIsLoading(false);
        return;
      }
      const res = await fetch(`/api/admin/payments/${paymentId}/restore`, {
        method: "POST",
        headers,
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to restore payment.");
        setIsLoading(false);
        return;
      }
      setSuccess("Payment restored.");
      setPayment((prev) => (prev ? { ...prev, deletedAt: null } : prev));
      setIsLoading(false);
    } catch {
      setError("Failed to restore payment.");
      setIsLoading(false);
    }
  }

  async function handleRefund() {
    if (!paymentId) return;
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setError("Please sign in again.");
        setIsLoading(false);
        return;
      }
      const res = await fetch(`/api/admin/payments/${paymentId}/refund`, {
        method: "POST",
        headers,
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to refund payment.");
        setIsLoading(false);
        return;
      }
      setSuccess("Refund processed.");
      setForm((prev) => ({ ...prev, status: "REFUNDED" }));
      setIsLoading(false);
    } catch {
      setError("Failed to refund payment.");
      setIsLoading(false);
    }
  }

  return (
    <Card className="space-y-4">
      {error ? (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          placeholder="Applicant ID"
          value={form.applicantId}
          onChange={(event) => updateField("applicantId", event.target.value)}
        />
        <Input
          placeholder="Event ID (optional)"
          value={form.eventId}
          onChange={(event) => updateField("eventId", event.target.value)}
        />
        <Select
          value={form.type}
          onChange={(event) => updateField("type", event.target.value)}
        >
          <option value="APPLICATION_FEE">Application Fee</option>
          <option value="EVENT_FEE">Event Fee</option>
          <option value="MEMBERSHIP">Membership</option>
        </Select>
        <Input
          type="number"
          placeholder="Amount (cents)"
          value={form.amount}
          onChange={(event) => updateField("amount", event.target.value)}
        />
        <Select
          value={form.status}
          onChange={(event) => updateField("status", event.target.value)}
        >
          <option value="PENDING">Pending</option>
          <option value="SUCCEEDED">Succeeded</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </Select>
        <Input
          placeholder="Stripe Payment ID"
          value={form.stripePaymentId}
          onChange={(event) =>
            updateField("stripePaymentId", event.target.value)
          }
        />
        <Input
          placeholder="Stripe Invoice ID"
          value={form.stripeInvoiceId}
          onChange={(event) =>
            updateField("stripeInvoiceId", event.target.value)
          }
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={handleSave}
          disabled={isLoading}
          className="bg-copper hover:bg-copper/90"
        >
          {isLoading ? "Saving..." : "Save"}
        </Button>
        {mode === "edit" ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleRefund}
              disabled={isLoading}
            >
              Mock Refund
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={isLoading}
            >
              Soft Delete
            </Button>
            {payment?.deletedAt ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleRestore}
                disabled={isLoading}
              >
                Restore
              </Button>
            ) : null}
          </>
        ) : null}
      </div>
    </Card>
  );
}
