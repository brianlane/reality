"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type WaitlistDetail = {
  id: string;
  user: { firstName: string; lastName: string; email: string };
  applicationStatus: string;
  waitlistReason: string | null;
  waitlistPosition: number | null;
  waitlistedAt: string | null;
  invitedOffWaitlistAt: string | null;
};

type AdminWaitlistDetailFormProps = {
  applicantId: string;
};

export default function AdminWaitlistDetailForm({
  applicantId,
}: AdminWaitlistDetailFormProps) {
  const [data, setData] = useState<WaitlistDetail | null>(null);
  const [waitlistReason, setWaitlistReason] = useState("");
  const [waitlistPosition, setWaitlistPosition] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    const loadDetail = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          return;
        }
        const res = await fetch(`/api/admin/waitlist/${applicantId}`, {
          headers,
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load waitlist detail.");
          return;
        }
        setData(json.applicant);
        setWaitlistReason(json.applicant.waitlistReason ?? "");
        setWaitlistPosition(
          json.applicant.waitlistPosition
            ? String(json.applicant.waitlistPosition)
            : "",
        );
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load waitlist detail.");
        }
      }
    };

    loadDetail();

    return () => controller.abort();
  }, [applicantId]);

  async function saveChanges() {
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const headers = await getAuthHeaders();
      if (!headers) {
        setError("Please sign in again.");
        setIsSaving(false);
        return;
      }
      const res = await fetch(`/api/admin/waitlist/${applicantId}`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          waitlistReason: waitlistReason || null,
          waitlistPosition: waitlistPosition ? Number(waitlistPosition) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to update waitlist details.");
        setIsSaving(false);
        return;
      }
      setSuccess("Waitlist details updated.");
      setIsSaving(false);
    } catch {
      setError("Failed to update waitlist details.");
      setIsSaving(false);
    }
  }

  if (error) {
    return <Card>{error}</Card>;
  }

  if (!data) {
    return <Card>Loading waitlist detail...</Card>;
  }

  return (
    <Card className="space-y-4">
      <div>
        <div className="text-lg font-semibold text-navy">
          {data.user.firstName} {data.user.lastName}
        </div>
        <div className="text-sm text-navy-soft">{data.user.email}</div>
        <div className="mt-1 text-xs text-navy-soft">
          Status: {data.applicationStatus}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-navy-soft">
          Waitlist Reason
        </label>
        <Textarea
          value={waitlistReason}
          onChange={(event) => setWaitlistReason(event.target.value)}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-navy-soft">
          Waitlist Position
        </label>
        <Input
          type="number"
          value={waitlistPosition}
          onChange={(event) => setWaitlistPosition(event.target.value)}
        />
      </div>

      {success ? (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      <Button
        type="button"
        onClick={saveChanges}
        disabled={isSaving}
        className="bg-copper hover:bg-copper/90"
      >
        {isSaving ? "Saving..." : "Save Changes"}
      </Button>
    </Card>
  );
}
