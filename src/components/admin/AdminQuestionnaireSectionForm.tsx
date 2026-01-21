"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type AdminQuestionnaireSectionFormProps = {
  sectionId?: string;
  mode: "create" | "edit";
};

type SectionDetail = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  isActive: boolean;
  deletedAt: string | null;
};

export default function AdminQuestionnaireSectionForm({
  sectionId,
  mode,
}: AdminQuestionnaireSectionFormProps) {
  const [section, setSection] = useState<SectionDetail | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    order: "0",
    isActive: "true",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (mode !== "edit" || !sectionId) return;
    const controller = new AbortController();

    const loadSection = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          return;
        }
        const res = await fetch(
          `/api/admin/questionnaire/sections/${sectionId}?includeDeleted=true`,
          {
            headers,
            signal: controller.signal,
          },
        );
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load section.");
          return;
        }
        const loaded = json.section as SectionDetail;
        setSection(loaded);
        setForm({
          title: loaded.title ?? "",
          description: loaded.description ?? "",
          order: String(loaded.order ?? 0),
          isActive: loaded.isActive ? "true" : "false",
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load section.");
        }
      }
    };

    loadSection();

    return () => controller.abort();
  }, [mode, sectionId]);

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
        isActive: form.isActive === "true",
      };

      const res = await fetch(
        mode === "create"
          ? "/api/admin/questionnaire/sections"
          : `/api/admin/questionnaire/sections/${sectionId}`,
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
        setError("Failed to save section.");
        setIsLoading(false);
        return;
      }
      setSuccess("Section saved.");
      setIsLoading(false);
    } catch {
      setError("Failed to save section.");
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!sectionId) return;
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
        `/api/admin/questionnaire/sections/${sectionId}`,
        {
          method: "DELETE",
          headers,
        },
      );
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to delete section.");
        setIsLoading(false);
        return;
      }
      setSuccess("Section deleted.");
      setSection((prev) =>
        prev ? { ...prev, deletedAt: new Date().toISOString() } : prev,
      );
      setIsLoading(false);
    } catch {
      setError("Failed to delete section.");
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
          placeholder="Section title"
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
          value={form.isActive}
          onChange={(event) => updateField("isActive", event.target.value)}
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
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
            disabled={isLoading || !!section?.deletedAt}
          >
            Soft Delete
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
