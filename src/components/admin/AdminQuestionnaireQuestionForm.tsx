"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type AdminQuestionnaireQuestionFormProps = {
  questionId?: string;
  mode: "create" | "edit";
  initialSectionId?: string;
};

type SectionOption = {
  id: string;
  title: string;
};

type QuestionDetail = {
  id: string;
  sectionId: string;
  prompt: string;
  helperText: string | null;
  type: string;
  options: unknown;
  order: number;
  isRequired: boolean;
  isActive: boolean;
  deletedAt: string | null;
  mlWeight: number;
  isDealbreaker: boolean;
};

type NumberScaleState = {
  min: string;
  max: string;
  step: string;
  minLabel: string;
  maxLabel: string;
};

const QUESTION_TYPES = [
  { value: "TEXT", label: "Single-line text" },
  { value: "TEXTAREA", label: "Multi-line text" },
  { value: "RICH_TEXT", label: "Rich text" },
  { value: "DROPDOWN", label: "Dropdown" },
  { value: "RADIO_7", label: "Radio (7 options)" },
  { value: "CHECKBOXES", label: "Checkboxes" },
  { value: "NUMBER_SCALE", label: "Number scale" },
] as const;

export default function AdminQuestionnaireQuestionForm({
  questionId,
  mode,
  initialSectionId,
}: AdminQuestionnaireQuestionFormProps) {
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [form, setForm] = useState({
    sectionId: initialSectionId ?? "",
    prompt: "",
    helperText: "",
    type: "TEXT",
    order: "0",
    isRequired: "false",
    isActive: "true",
    mlWeight: "1.0",
    isDealbreaker: "false",
  });
  const [optionLines, setOptionLines] = useState<string>("");
  const [scaleOptions, setScaleOptions] = useState<NumberScaleState>({
    min: "1",
    max: "10",
    step: "1",
    minLabel: "",
    maxLabel: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const optionHelp = useMemo(() => {
    if (form.type === "RADIO_7") {
      return "Enter exactly 7 options (one per line).";
    }
    if (form.type === "DROPDOWN" || form.type === "CHECKBOXES") {
      return "Enter one option per line.";
    }
    return "";
  }, [form.type]);

  useEffect(() => {
    const controller = new AbortController();

    const loadSections = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          return;
        }
        const res = await fetch("/api/admin/questionnaire/sections", {
          headers,
          signal: controller.signal,
        });
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load sections.");
          return;
        }
        setSections(
          (json.sections ?? []).map((section: SectionOption) => ({
            id: section.id,
            title: section.title,
          })),
        );
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load sections.");
        }
      }
    };

    loadSections();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (mode !== "edit" || !questionId) return;
    const controller = new AbortController();

    const loadQuestion = async () => {
      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          return;
        }
        const res = await fetch(
          `/api/admin/questionnaire/questions/${questionId}?includeDeleted=true`,
          {
            headers,
            signal: controller.signal,
          },
        );
        const json = await res.json();
        if (!res.ok || json?.error) {
          setError("Failed to load question.");
          return;
        }
        const loaded = json.question as QuestionDetail;
        setQuestion(loaded);
        setForm({
          sectionId: loaded.sectionId ?? "",
          prompt: loaded.prompt ?? "",
          helperText: loaded.helperText ?? "",
          type: loaded.type ?? "TEXT",
          order: String(loaded.order ?? 0),
          isRequired: loaded.isRequired ? "true" : "false",
          isActive: loaded.isActive ? "true" : "false",
          mlWeight: String(loaded.mlWeight ?? 1.0),
          isDealbreaker: loaded.isDealbreaker ? "true" : "false",
        });
        if (loaded.type === "NUMBER_SCALE" && loaded.options) {
          const options = loaded.options as Record<string, unknown>;
          setScaleOptions({
            min: String(options.min ?? "1"),
            max: String(options.max ?? "10"),
            step: String(options.step ?? "1"),
            minLabel: options.minLabel ? String(options.minLabel) : "",
            maxLabel: options.maxLabel ? String(options.maxLabel) : "",
          });
        } else if (Array.isArray(loaded.options)) {
          setOptionLines(loaded.options.join("\n"));
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load question.");
        }
      }
    };

    loadQuestion();

    return () => controller.abort();
  }, [mode, questionId]);

  function updateField(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function buildOptionsPayload() {
    if (form.type === "NUMBER_SCALE") {
      return {
        min: Number(scaleOptions.min || 1),
        max: Number(scaleOptions.max || 10),
        step: Number(scaleOptions.step || 1),
        minLabel: scaleOptions.minLabel || undefined,
        maxLabel: scaleOptions.maxLabel || undefined,
      };
    }
    if (["DROPDOWN", "RADIO_7", "CHECKBOXES"].includes(form.type)) {
      return optionLines
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    }
    return null;
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
        sectionId: form.sectionId,
        prompt: form.prompt,
        helperText: form.helperText || null,
        type: form.type,
        options: buildOptionsPayload(),
        order: Number(form.order || 0),
        isRequired: form.isRequired === "true",
        isActive: form.isActive === "true",
        mlWeight: form.mlWeight !== "" ? Number(form.mlWeight) : 1.0,
        isDealbreaker: form.isDealbreaker === "true",
      };

      const res = await fetch(
        mode === "create"
          ? "/api/admin/questionnaire/questions"
          : `/api/admin/questionnaire/questions/${questionId}`,
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
        setError(json?.error?.message ?? "Failed to save question.");
        setIsLoading(false);
        return;
      }
      setSuccess("Question saved.");
      setIsLoading(false);
    } catch {
      setError("Failed to save question.");
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!questionId) return;
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
        `/api/admin/questionnaire/questions/${questionId}`,
        {
          method: "DELETE",
          headers,
        },
      );
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to delete question.");
        setIsLoading(false);
        return;
      }
      setSuccess("Question deleted.");
      setQuestion((prev) =>
        prev ? { ...prev, deletedAt: new Date().toISOString() } : prev,
      );
      setIsLoading(false);
    } catch {
      setError("Failed to delete question.");
      setIsLoading(false);
    }
  }

  async function handleHardDelete() {
    if (!questionId) return;
    if (
      !window.confirm(
        "Permanently delete this question and its answers? This cannot be undone.",
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
        `/api/admin/questionnaire/questions/${questionId}/hard-delete`,
        {
          method: "DELETE",
          headers,
        },
      );
      const json = await res.json();
      if (!res.ok || json?.error) {
        setError("Failed to permanently delete question.");
        setIsLoading(false);
        return;
      }
      setSuccess("Question permanently deleted.");
      setIsLoading(false);
    } catch {
      setError("Failed to permanently delete question.");
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
        <Select
          value={form.sectionId}
          onChange={(event) => updateField("sectionId", event.target.value)}
        >
          <option value="">Select section</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.title}
            </option>
          ))}
        </Select>
        <Select
          value={form.type}
          onChange={(event) => updateField("type", event.target.value)}
        >
          {QUESTION_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
        <Input
          placeholder="Prompt"
          value={form.prompt}
          onChange={(event) => updateField("prompt", event.target.value)}
        />
        <Input
          placeholder="Order"
          type="number"
          value={form.order}
          onChange={(event) => updateField("order", event.target.value)}
        />
        <Select
          value={form.isRequired}
          onChange={(event) => updateField("isRequired", event.target.value)}
        >
          <option value="false">Optional</option>
          <option value="true">Required</option>
        </Select>
        <Select
          value={form.isActive}
          onChange={(event) => updateField("isActive", event.target.value)}
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
        <Input
          placeholder="Weight (0-1)"
          type="number"
          step="0.1"
          min="0"
          max="1"
          value={form.mlWeight}
          onChange={(event) => updateField("mlWeight", event.target.value)}
        />
        <Select
          value={form.isDealbreaker}
          onChange={(event) => updateField("isDealbreaker", event.target.value)}
        >
          <option value="false">Not a dealbreaker</option>
          <option value="true">Dealbreaker</option>
        </Select>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold text-navy-soft">
          Helper text
        </label>
        <Textarea
          value={form.helperText}
          onChange={(event) => updateField("helperText", event.target.value)}
        />
      </div>
      {["DROPDOWN", "RADIO_7", "CHECKBOXES"].includes(form.type) ? (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-navy-soft">
            Options
          </label>
          {optionHelp ? (
            <p className="text-xs text-navy-soft">{optionHelp}</p>
          ) : null}
          <Textarea
            value={optionLines}
            onChange={(event) => setOptionLines(event.target.value)}
            rows={6}
          />
        </div>
      ) : null}
      {form.type === "NUMBER_SCALE" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            type="number"
            placeholder="Min"
            value={scaleOptions.min}
            onChange={(event) =>
              setScaleOptions((prev) => ({
                ...prev,
                min: event.target.value,
              }))
            }
          />
          <Input
            type="number"
            placeholder="Max"
            value={scaleOptions.max}
            onChange={(event) =>
              setScaleOptions((prev) => ({
                ...prev,
                max: event.target.value,
              }))
            }
          />
          <Input
            type="number"
            placeholder="Step"
            value={scaleOptions.step}
            onChange={(event) =>
              setScaleOptions((prev) => ({
                ...prev,
                step: event.target.value,
              }))
            }
          />
          <Input
            placeholder="Min label"
            value={scaleOptions.minLabel}
            onChange={(event) =>
              setScaleOptions((prev) => ({
                ...prev,
                minLabel: event.target.value,
              }))
            }
          />
          <Input
            placeholder="Max label"
            value={scaleOptions.maxLabel}
            onChange={(event) =>
              setScaleOptions((prev) => ({
                ...prev,
                maxLabel: event.target.value,
              }))
            }
          />
        </div>
      ) : null}
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
            disabled={isLoading || !!question?.deletedAt}
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
