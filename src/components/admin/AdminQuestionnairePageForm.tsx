"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type AdminQuestionnairePageFormProps = {
  pageId?: string;
  mode: "create" | "edit";
};

type PageDetail = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  forResearch: boolean;
  deletedAt: string | null;
};

export default function AdminQuestionnairePageForm({
  pageId,
  mode,
}: AdminQuestionnairePageFormProps) {
  const [page, setPage] = useState<PageDetail | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    order: "0",
    forResearch: "false",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (mode !== "edit" || !pageId) return;
    const controller = new AbortController();

    const loadPage = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          return;
        }
        const res = await fetch(
          `/api/admin/questionnaire/pages/${pageId}?includeDeleted=true`,
          {
            headers,
            signal: controller.signal,
          },
        );
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load page.");
          return;
        }
        const loaded = json.page as PageDetail;
        setPage(loaded);
        setForm({
          title: loaded.title ?? "",
          description: loaded.description ?? "",
          order: String(loaded.order ?? 0),
          forResearch: loaded.forResearch ? "true" : "false",
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load page.");
        }
      }
    };

    loadPage();

    return () => controller.abort();
  }, [mode, pageId]);

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
        title: form.title,
        description: form.description || null,
        order: Number(form.order || 0),
        forResearch: form.forResearch === "true",
      };

      const res = await fetch(
        mode === "create"
          ? "/api/admin/questionnaire/pages"
          : `/api/admin/questionnaire/pages/${pageId}`,
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
        setError("Failed to save page.");
        setIsLoading(false);
        return;
      }
      setSuccess("Page saved.");
      setIsLoading(false);
    } catch {
      setError("Failed to save page.");
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!pageId) return;
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
      const res = await fetch(`/api/admin/questionnaire/pages/${pageId}`, {
        method: "DELETE",
        headers,
      });
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to delete page.");
        setIsLoading(false);
        return;
      }
      setSuccess("Page deleted.");
      setPage((prev) =>
        prev ? { ...prev, deletedAt: new Date().toISOString() } : prev,
      );
      setIsLoading(false);
    } catch {
      setError("Failed to delete page.");
      setIsLoading(false);
    }
  }

  async function handleHardDelete() {
    if (!pageId) return;
    if (
      !window.confirm(
        "Permanently delete this page and all related sections, questions, and answers? This cannot be undone.",
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
        `/api/admin/questionnaire/pages/${pageId}/hard-delete`,
        {
          method: "DELETE",
          headers,
        },
      );
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to permanently delete page.");
        setIsLoading(false);
        return;
      }
      setSuccess("Page permanently deleted.");
      setIsLoading(false);
    } catch {
      setError("Failed to permanently delete page.");
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
          placeholder="Page title"
          value={form.title}
          onChange={(event) => updateField("title", event.target.value)}
        />
        <Input
          type="number"
          placeholder="Order"
          value={form.order}
          onChange={(event) => updateField("order", event.target.value)}
        />
        <Select
          value={form.forResearch}
          onChange={(event) => updateField("forResearch", event.target.value)}
        >
          <option value="false">Application Participants</option>
          <option value="true">Research Participants Only</option>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-navy-soft">
          Description
        </label>
        <Textarea
          value={form.description}
          onChange={(event) => updateField("description", event.target.value)}
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
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            disabled={isLoading || !!page?.deletedAt}
          >
            Soft Delete
          </Button>
        ) : null}
        {mode === "edit" ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleHardDelete}
            disabled={isLoading}
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            Hard Delete
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
