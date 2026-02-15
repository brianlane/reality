"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type AdminUserFormProps = {
  userId?: string;
  mode: "create" | "edit";
};

type UserDetail = {
  id: string;
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  applicant?: {
    id: string;
    applicationStatus: string;
  } | null;
  deletedAt: string | null;
};

export default function AdminUserForm({ userId, mode }: AdminUserFormProps) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [form, setForm] = useState({
    clerkId: "",
    email: "",
    firstName: "",
    lastName: "",
    role: "APPLICANT",
    applicationStatus: "SUBMITTED",
  });
  const [initialApplicationStatus, setInitialApplicationStatus] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (mode !== "edit" || !userId) {
      return;
    }

    const controller = new AbortController();

    const loadUser = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          return;
        }
        const res = await fetch(
          `/api/admin/users/${userId}?includeDeleted=true`,
          {
            headers,
            signal: controller.signal,
          },
        );
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load user.");
          return;
        }
        setUser(json.user);
        const status = json.user.applicant?.applicationStatus ?? "SUBMITTED";
        setInitialApplicationStatus(status);
        setForm({
          clerkId: json.user.clerkId ?? "",
          email: json.user.email ?? "",
          firstName: json.user.firstName ?? "",
          lastName: json.user.lastName ?? "",
          role: json.user.role ?? "APPLICANT",
          applicationStatus: status,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load user.");
        }
      }
    };

    loadUser();

    return () => controller.abort();
  }, [mode, userId]);

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
      const payload = {
        ...form,
        // Only include applicationStatus if it has changed from initial value
        // This prevents validation errors for applicants in invite-only statuses
        applicationStatus:
          mode === "edit" &&
          user?.applicant &&
          form.applicationStatus !== initialApplicationStatus
            ? form.applicationStatus
            : undefined,
      };

      const res = await fetch(
        mode === "create" ? "/api/admin/users" : `/api/admin/users/${userId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError(json?.error?.message || json?.error || "Failed to save user.");
        setIsLoading(false);
        return;
      }
      setSuccess("User saved.");
      // Update initial status to current value after successful save
      // This ensures subsequent status changes are detected correctly
      if (mode === "edit" && payload.applicationStatus !== undefined) {
        setInitialApplicationStatus(form.applicationStatus);
      }
      if (mode === "create") {
        setForm({
          clerkId: "",
          email: "",
          firstName: "",
          lastName: "",
          role: "APPLICANT",
          applicationStatus: "SUBMITTED",
        });
      }
      setIsLoading(false);
    } catch {
      setError("Failed to save user.");
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!userId) return;
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
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers,
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to delete user.");
        setIsLoading(false);
        return;
      }
      setSuccess("User deleted.");
      setUser((prev) =>
        prev ? { ...prev, deletedAt: new Date().toISOString() } : prev,
      );
      setIsLoading(false);
    } catch {
      setError("Failed to delete user.");
      setIsLoading(false);
    }
  }

  async function handleHardDelete() {
    if (!userId) return;
    if (
      !window.confirm(
        "Permanently delete this user (and any applicant data)? This cannot be undone.",
      )
    ) {
      return;
    }
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
      const res = await fetch(`/api/admin/users/${userId}/hard-delete`, {
        method: "DELETE",
        headers,
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to permanently delete user.");
        setIsLoading(false);
        return;
      }
      setSuccess("User permanently deleted.");
      setIsLoading(false);
    } catch {
      setError("Failed to permanently delete user.");
      setIsLoading(false);
    }
  }

  async function handleRestore() {
    if (!userId) return;
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
      const res = await fetch(`/api/admin/users/${userId}/restore`, {
        method: "POST",
        headers,
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to restore user.");
        setIsLoading(false);
        return;
      }
      setSuccess("User restored.");
      setUser((prev) => (prev ? { ...prev, deletedAt: null } : prev));
      setIsLoading(false);
    } catch {
      setError("Failed to restore user.");
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
          placeholder="Clerk ID"
          value={form.clerkId}
          onChange={(event) => updateField("clerkId", event.target.value)}
        />
        <Input
          placeholder="Email"
          value={form.email}
          onChange={(event) => updateField("email", event.target.value)}
        />
        <Input
          placeholder="First name"
          value={form.firstName}
          onChange={(event) => updateField("firstName", event.target.value)}
        />
        <Input
          placeholder="Last name"
          value={form.lastName}
          onChange={(event) => updateField("lastName", event.target.value)}
        />
        <Select
          value={form.role}
          onChange={(event) => updateField("role", event.target.value)}
        >
          <option value="APPLICANT">Applicant</option>
          <option value="ADMIN">Admin</option>
        </Select>
        {mode === "edit" && user?.applicant ? (
          <Select
            value={form.applicationStatus}
            onChange={(event) =>
              updateField("applicationStatus", event.target.value)
            }
            disabled={form.applicationStatus.startsWith("RESEARCH_")}
            title={
              form.applicationStatus.startsWith("RESEARCH_")
                ? "Research statuses cannot be changed. Use /admin/research to manage research participants."
                : undefined
            }
          >
            <option value="DRAFT">Draft</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="PAYMENT_PENDING">Payment Pending</option>
            <option value="SCREENING_IN_PROGRESS">Screening</option>
            <option value="APPROVED">Approved</option>
            <option value="WAITLIST">Waitlist</option>
            {/* Invite-only and research statuses cannot be set directly */}
            {/* Show current status as read-only if applicant is in one of these states */}
            {(form.applicationStatus === "WAITLIST_INVITED" ||
              form.applicationStatus.startsWith("RESEARCH_")) && (
              <option value={form.applicationStatus} disabled>
                {form.applicationStatus.replace(/_/g, " ")} (read-only)
              </option>
            )}
          </Select>
        ) : null}
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
              onClick={handleDelete}
              disabled={isLoading}
            >
              Soft Delete
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleHardDelete}
              disabled={isLoading}
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              Hard Delete
            </Button>
            {user?.deletedAt ? (
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
