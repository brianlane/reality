"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";
import { runSkipPaymentFlow } from "@/lib/admin/skip-payment";

type AdminApplicationFormProps = {
  applicationId?: string;
  mode: "create" | "edit";
};

export default function AdminApplicationForm({
  applicationId,
  mode,
}: AdminApplicationFormProps) {
  const [form, setForm] = useState({
    clerkId: "",
    email: "",
    firstName: "",
    lastName: "",
    role: "APPLICANT",
    age: "",
    gender: "MAN",
    location: "",
    cityFrom: "",
    industry: "",
    occupation: "",
    employer: "",
    education: "",
    incomeRange: "",
    referredBy: "",
    aboutYourself: "",
    applicationStatus: "SUBMITTED",
    screeningStatus: "PENDING",
    compatibilityScore: "",
    notes: "",
    photos: "",
  });
  const canSkipPayment = form.applicationStatus === "PAYMENT_PENDING";
  const [initialApplicationStatus, setInitialApplicationStatus] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (mode !== "edit" || !applicationId) return;
    const controller = new AbortController();

    const loadApplication = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          return;
        }
        const res = await fetch(
          `/api/admin/applications/${applicationId}?includeDeleted=true`,
          { headers, signal: controller.signal },
        );
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load application.");
          return;
        }
        const status = json.applicant.applicationStatus ?? "SUBMITTED";
        setInitialApplicationStatus(status);
        setForm((prev) => ({
          ...prev,
          email: json.applicant.email ?? "",
          firstName: json.applicant.firstName ?? "",
          lastName: json.applicant.lastName ?? "",
          age: String(json.applicant.age ?? ""),
          gender: json.applicant.gender ?? "MAN",
          location: json.applicant.location ?? "",
          cityFrom: json.applicant.cityFrom ?? "",
          industry: json.applicant.industry ?? "",
          occupation: json.applicant.occupation ?? "",
          employer: json.applicant.employer ?? "",
          education: json.applicant.education ?? "",
          incomeRange: json.applicant.incomeRange ?? "",
          referredBy: json.applicant.referredBy ?? "",
          aboutYourself: json.applicant.aboutYourself ?? "",
          applicationStatus: status,
          screeningStatus: json.applicant.screeningStatus ?? "PENDING",
          compatibilityScore: json.applicant.compatibilityScore
            ? String(json.applicant.compatibilityScore)
            : "",
          photos: Array.isArray(json.applicant.photos)
            ? json.applicant.photos.join(", ")
            : "",
        }));
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load application.");
        }
      }
    };

    loadApplication();

    return () => controller.abort();
  }, [mode, applicationId]);

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
      const payload =
        mode === "create"
          ? {
              user: {
                clerkId: form.clerkId,
                email: form.email,
                firstName: form.firstName,
                lastName: form.lastName,
                role: form.role,
              },
              applicant: {
                age: Number(form.age),
                gender: form.gender,
                location: form.location,
                cityFrom: form.cityFrom.trim(),
                industry: form.industry.trim(),
                occupation: form.occupation,
                employer: form.employer || null,
                education: form.education,
                incomeRange: form.incomeRange,
                referredBy: form.referredBy.trim() || null,
                aboutYourself: form.aboutYourself.trim(),
                applicationStatus: form.applicationStatus,
                screeningStatus: form.screeningStatus,
                photos: form.photos
                  ? form.photos.split(",").map((item) => item.trim())
                  : [],
              },
            }
          : {
              applicant: {
                age: form.age ? Number(form.age) : undefined,
                gender: form.gender,
                location: form.location,
                cityFrom: form.cityFrom.trim() || undefined,
                industry: form.industry.trim() || undefined,
                occupation: form.occupation,
                employer: form.employer || null,
                education: form.education,
                incomeRange: form.incomeRange,
                referredBy: form.referredBy.trim() || null,
                aboutYourself: form.aboutYourself.trim() || undefined,
                // Only include applicationStatus if it has changed from initial value
                // This prevents validation errors for applicants in invite-only statuses
                applicationStatus:
                  mode === "edit" &&
                  form.applicationStatus === initialApplicationStatus
                    ? undefined
                    : form.applicationStatus === "REJECTED"
                      ? undefined
                      : form.applicationStatus,
                screeningStatus: form.screeningStatus,
                compatibilityScore: form.compatibilityScore
                  ? Number(form.compatibilityScore)
                  : undefined,
                backgroundCheckNotes: form.notes || null,
                photos: form.photos
                  ? form.photos.split(",").map((item) => item.trim())
                  : undefined,
              },
            };

      const res = await fetch(
        mode === "create"
          ? "/api/admin/applications"
          : `/api/admin/applications/${applicationId}`,
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
        setError("Failed to save application.");
        setIsLoading(false);
        return;
      }
      setSuccess("Application saved.");
      // Update initial status to current value after successful save
      // This ensures subsequent status changes are detected correctly
      if (
        mode === "edit" &&
        payload.applicant?.applicationStatus !== undefined
      ) {
        setInitialApplicationStatus(form.applicationStatus);
      }
      setIsLoading(false);
    } catch {
      setError("Failed to save application.");
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!applicationId) return;
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
      const res = await fetch(`/api/admin/applications/${applicationId}`, {
        method: "DELETE",
        headers,
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to delete application.");
        setIsLoading(false);
        return;
      }
      setSuccess("Application deleted.");
      setIsLoading(false);
    } catch {
      setError("Failed to delete application.");
      setIsLoading(false);
    }
  }

  async function handleHardDelete() {
    if (!applicationId) return;
    if (
      !window.confirm(
        "Permanently delete this application and all related data? This cannot be undone.",
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
      const res = await fetch(
        `/api/admin/applications/${applicationId}/hard-delete`,
        {
          method: "DELETE",
          headers,
        },
      );
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to permanently delete application.");
        setIsLoading(false);
        return;
      }
      setSuccess("Application permanently deleted.");
      setIsLoading(false);
    } catch {
      setError("Failed to permanently delete application.");
      setIsLoading(false);
    }
  }

  async function handleRestore() {
    if (!applicationId) return;
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
        `/api/admin/applications/${applicationId}/restore`,
        {
          method: "POST",
          headers,
        },
      );
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to restore application.");
        setIsLoading(false);
        return;
      }
      setSuccess("Application restored.");
      setIsLoading(false);
    } catch {
      setError("Failed to restore application.");
      setIsLoading(false);
    }
  }

  async function handleApprove() {
    if (!applicationId) return;
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
        `/api/admin/applications/${applicationId}/approve`,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            compatibilityScore: form.compatibilityScore
              ? Number(form.compatibilityScore)
              : undefined,
            notes: form.notes || undefined,
          }),
        },
      );
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to approve application.");
        setIsLoading(false);
        return;
      }
      setSuccess("Application approved.");
      setIsLoading(false);
    } catch {
      setError("Failed to approve application.");
      setIsLoading(false);
    }
  }

  async function handleReject() {
    if (!applicationId) return;
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
        `/api/admin/applications/${applicationId}/reject`,
        {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ reason: form.notes || undefined }),
        },
      );
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to reject application.");
        setIsLoading(false);
        return;
      }
      setSuccess("Applicant soft rejected.");
      setIsLoading(false);
    } catch {
      setError("Failed to reject application.");
      setIsLoading(false);
    }
  }

  async function handleSkipPayment() {
    await runSkipPaymentFlow({
      applicationId,
      confirmAction: (message) => window.confirm(message),
      getAuthHeaders,
      setIsLoading,
      setError,
      setSuccess,
      setApplicationStatusDraft: () => {
        setForm((prev) => ({ ...prev, applicationStatus: "DRAFT" }));
        setInitialApplicationStatus("DRAFT");
      },
    });
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
        {mode === "create" ? (
          <>
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
          </>
        ) : null}
        <Input
          type="number"
          placeholder="Age"
          value={form.age}
          onChange={(event) => updateField("age", event.target.value)}
        />
        <Select
          value={form.gender}
          onChange={(event) => updateField("gender", event.target.value)}
        >
          <option value="MAN">Man</option>
          <option value="WOMAN">Woman</option>
          <option value="NON_BINARY">Non-binary</option>
          <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
        </Select>
        <Input
          placeholder="Location"
          value={form.location}
          onChange={(event) => updateField("location", event.target.value)}
        />
        <Input
          placeholder="City From"
          value={form.cityFrom}
          onChange={(event) => updateField("cityFrom", event.target.value)}
        />
        <Input
          placeholder="Occupation"
          value={form.occupation}
          onChange={(event) => updateField("occupation", event.target.value)}
        />
        <Input
          placeholder="Industry"
          value={form.industry}
          onChange={(event) => updateField("industry", event.target.value)}
        />
        <Input
          placeholder="Employer"
          value={form.employer}
          onChange={(event) => updateField("employer", event.target.value)}
        />
        <Input
          placeholder="Education"
          value={form.education}
          onChange={(event) => updateField("education", event.target.value)}
        />
        <Input
          placeholder="Income Range"
          value={form.incomeRange}
          onChange={(event) => updateField("incomeRange", event.target.value)}
        />
        <Input
          placeholder="Referred By (optional)"
          value={form.referredBy}
          onChange={(event) => updateField("referredBy", event.target.value)}
        />
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
          {/* Invite-only statuses (WAITLIST_INVITED, RESEARCH_INVITED) cannot be set directly */}
          {/* Use dedicated invite endpoints to set these statuses with required metadata */}
          {(form.applicationStatus === "WAITLIST_INVITED" ||
            form.applicationStatus.startsWith("RESEARCH_")) && (
            <option value={form.applicationStatus} disabled>
              {form.applicationStatus.replace(/_/g, " ")} (read-only)
            </option>
          )}
        </Select>
        <Select
          value={form.screeningStatus}
          onChange={(event) =>
            updateField("screeningStatus", event.target.value)
          }
        >
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="PASSED">Passed</option>
          <option value="FAILED">Failed</option>
        </Select>
        <Input
          placeholder="Compatibility Score"
          value={form.compatibilityScore}
          onChange={(event) =>
            updateField("compatibilityScore", event.target.value)
          }
        />
        <div className="col-span-2 space-y-2">
          <label className="text-xs font-semibold text-navy-soft">
            Photos (
            {form.photos
              ? form.photos.split(",").filter((u) => u.trim()).length
              : 0}
            )
          </label>
          {form.photos &&
          form.photos.split(",").filter((u) => u.trim()).length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {form.photos
                .split(",")
                .filter((u) => u.trim())
                .map((url, i) => (
                  <a
                    key={i}
                    href={url.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src={url.trim()}
                      alt={`Photo ${i + 1}`}
                      className="h-32 w-32 rounded-lg object-cover border border-slate-200 hover:opacity-80 transition-opacity"
                    />
                  </a>
                ))}
            </div>
          ) : (
            <p className="text-sm text-navy-soft/60">No photos uploaded.</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-navy-soft">
          About Yourself
        </label>
        <Textarea
          value={form.aboutYourself}
          onChange={(event) => updateField("aboutYourself", event.target.value)}
          rows={4}
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-navy-soft">
          Review Notes
        </label>
        <Textarea
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
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
              onClick={handleApprove}
              disabled={isLoading}
            >
              Approve
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReject}
              disabled={isLoading}
            >
              Soft Reject
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleSkipPayment}
              disabled={isLoading || !canSkipPayment}
              title={
                canSkipPayment
                  ? undefined
                  : "Skip Payment is only available for PAYMENT_PENDING applicants."
              }
            >
              Skip Payment
            </Button>
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
            <Button
              type="button"
              variant="outline"
              onClick={handleRestore}
              disabled={isLoading}
            >
              Restore
            </Button>
          </>
        ) : null}
      </div>
    </Card>
  );
}
