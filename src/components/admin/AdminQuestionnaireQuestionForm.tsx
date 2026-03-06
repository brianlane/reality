"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  sectionTitle?: string;
  pageId?: string | null;
  pageTitle?: string | null;
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

type NavigationInfo = {
  prevQuestion: { id: string; prompt: string } | null;
  nextQuestion: { id: string; prompt: string } | null;
  totalInSection: number;
  currentPosition: number;
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
  { value: "AGE_RANGE", label: "Age range (two dropdowns)" },
  { value: "POINT_ALLOCATION", label: "Point allocation" },
  { value: "RANKING", label: "Ranking (drag & drop)" },
] as const;

// Age options for the AGE_RANGE type
const AGE_OPTIONS = Array.from({ length: 63 }, (_, i) => i + 18); // 18-80

export default function AdminQuestionnaireQuestionForm({
  questionId,
  mode,
  initialSectionId,
}: AdminQuestionnaireQuestionFormProps) {
  const router = useRouter();
  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [navigation, setNavigation] = useState<NavigationInfo | null>(null);
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
  const [pointAllocationTotal, setPointAllocationTotal] =
    useState<string>("100");
  const [ageRangeOptions, setAgeRangeOptions] = useState({
    minAge: "18",
    maxAge: "80",
  });
  const [checkboxMaxSelections, setCheckboxMaxSelections] =
    useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(mode === "edit");

  const optionHelp = useMemo(() => {
    if (form.type === "RADIO_7") {
      return "Enter exactly 7 options (one per line).";
    }
    if (form.type === "DROPDOWN" || form.type === "CHECKBOXES") {
      return "Enter one option per line.";
    }
    if (form.type === "POINT_ALLOCATION") {
      return "Enter items to allocate points to (one per line).";
    }
    if (form.type === "RANKING") {
      return "Enter items to rank (one per line).";
    }
    return "";
  }, [form.type]);

  // Load sections and question data in parallel for faster loading
  useEffect(() => {
    const controller = new AbortController();

    const loadData = async () => {
      // Reset loading state and clear stale data when navigating between questions
      setIsDataLoading(true);
      setQuestion(null);
      setNavigation(null);
      setError(null);
      setSuccess(null);

      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          setIsDataLoading(false);
          return;
        }

        // Build fetch promises - load sections and question in parallel
        const fetchPromises: Promise<Response>[] = [
          fetch("/api/admin/questionnaire/sections", {
            headers,
            signal: controller.signal,
          }),
        ];

        // Add question fetch if in edit mode
        if (mode === "edit" && questionId) {
          fetchPromises.push(
            fetch(
              `/api/admin/questionnaire/questions/${questionId}?includeDeleted=true`,
              {
                headers,
                signal: controller.signal,
              },
            ),
          );
        }

        // Execute all fetches in parallel
        const responses = await Promise.all(fetchPromises);
        const [sectionsRes, questionRes] = responses;

        // Process sections response
        const sectionsJson = await sectionsRes.json();
        if (sectionsRes.ok && !sectionsJson?.error) {
          setSections(
            (sectionsJson.sections ?? []).map((section: SectionOption) => ({
              id: section.id,
              title: section.title,
            })),
          );
        } else {
          setError("Failed to load sections.");
        }

        // Process question response if in edit mode
        if (questionRes) {
          const questionJson = await questionRes.json();
          if (questionRes.ok && !questionJson?.error) {
            const loaded = questionJson.question as QuestionDetail;
            setQuestion(loaded);
            if (questionJson.navigation) {
              setNavigation(questionJson.navigation as NavigationInfo);
            }
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
            } else if (loaded.type === "AGE_RANGE" && loaded.options) {
              const options = loaded.options as {
                minAge?: number;
                maxAge?: number;
              };
              setAgeRangeOptions({
                minAge: String(options.minAge ?? 18),
                maxAge: String(options.maxAge ?? 80),
              });
            } else if (loaded.type === "POINT_ALLOCATION" && loaded.options) {
              const options = loaded.options as {
                items?: string[];
                total?: number;
              };
              setOptionLines((options.items ?? []).join("\n"));
              setPointAllocationTotal(String(options.total ?? 100));
            } else if (loaded.type === "RANKING" && loaded.options) {
              const options = loaded.options as { items?: string[] };
              setOptionLines((options.items ?? []).join("\n"));
            } else if (loaded.type === "CHECKBOXES" && loaded.options) {
              if (Array.isArray(loaded.options)) {
                setOptionLines(loaded.options.join("\n"));
              } else {
                const opts = loaded.options as {
                  options?: string[];
                  maxSelections?: number;
                };
                setOptionLines((opts.options ?? []).join("\n"));
                if (opts.maxSelections !== undefined) {
                  setCheckboxMaxSelections(String(opts.maxSelections));
                }
              }
            } else if (Array.isArray(loaded.options)) {
              setOptionLines(loaded.options.join("\n"));
            }
          } else {
            setError("Failed to load question.");
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load data.");
        }
      } finally {
        setIsDataLoading(false);
      }
    };

    loadData();

    return () => controller.abort();
  }, [mode, questionId]);

  function updateField(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
    // Set default options when switching to RADIO_7 type
    if (name === "type" && value === "RADIO_7" && optionLines.trim() === "") {
      setOptionLines("1\n2\n3\n4\n5\n6\n7");
    }
    // Set default total when switching to POINT_ALLOCATION
    if (name === "type" && value === "POINT_ALLOCATION") {
      setPointAllocationTotal("100");
    }
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
    if (form.type === "AGE_RANGE") {
      return {
        minAge: Number(ageRangeOptions.minAge || 18),
        maxAge: Number(ageRangeOptions.maxAge || 80),
      };
    }
    if (["DROPDOWN", "RADIO_7"].includes(form.type)) {
      return optionLines
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    }
    if (form.type === "CHECKBOXES") {
      const options = optionLines
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const maxSelections = checkboxMaxSelections.trim()
        ? parseInt(checkboxMaxSelections.trim(), 10)
        : undefined;
      return {
        options,
        ...(maxSelections !== undefined && !isNaN(maxSelections)
          ? { maxSelections }
          : {}),
      };
    }
    if (form.type === "POINT_ALLOCATION") {
      return {
        items: optionLines
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        total: Number(pointAllocationTotal || 100),
      };
    }
    if (form.type === "RANKING") {
      return {
        items: optionLines
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      };
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
    <div className="space-y-4">
      {/* Navigation breadcrumb and controls */}
      {mode === "edit" && question && (
        <div className="space-y-3">
          {/* Breadcrumb navigation */}
          <nav className="flex items-center gap-2 text-sm text-navy-soft">
            <Link
              href="/admin/questionnaire"
              className="hover:text-copper hover:underline"
            >
              Questionnaire
            </Link>
            <span>/</span>
            {question.pageId && question.pageTitle && (
              <>
                <Link
                  href={`/admin/questionnaire/pages/${question.pageId}`}
                  className="hover:text-copper hover:underline"
                >
                  {question.pageTitle}
                </Link>
                <span>/</span>
              </>
            )}
            <Link
              href={`/admin/questionnaire/sections/${question.sectionId}`}
              className="hover:text-copper hover:underline"
            >
              {question.sectionTitle || "Section"}
            </Link>
            <span>/</span>
            <span className="font-medium text-navy">
              Question {navigation?.currentPosition || question.order + 1}
            </span>
          </nav>

          {/* Question navigation */}
          {navigation && (
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!navigation.prevQuestion}
                  onClick={() =>
                    navigation.prevQuestion &&
                    router.push(
                      `/admin/questionnaire/questions/${navigation.prevQuestion.id}`,
                    )
                  }
                  className="gap-1 px-3 py-1 text-xs"
                >
                  <span>←</span> Previous
                </Button>
                <span className="text-sm text-navy-soft">
                  {navigation.currentPosition} of {navigation.totalInSection} in
                  section
                </span>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!navigation.nextQuestion}
                  onClick={() =>
                    navigation.nextQuestion &&
                    router.push(
                      `/admin/questionnaire/questions/${navigation.nextQuestion.id}`,
                    )
                  }
                  className="gap-1 px-3 py-1 text-xs"
                >
                  Next <span>→</span>
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/questionnaire/sections/${question.sectionId}`}
                  className="text-sm text-copper hover:underline"
                >
                  View Section
                </Link>
                {question.pageId && (
                  <>
                    <span className="text-gray-300">|</span>
                    <Link
                      href={`/admin/questionnaire/pages/${question.pageId}`}
                      className="text-sm text-copper hover:underline"
                    >
                      View Page
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <Card className="space-y-4">
        {isDataLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-copper border-t-transparent"></div>
              <p className="mt-2 text-sm text-navy-soft">Loading question...</p>
            </div>
          </div>
        ) : (
          <>
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
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="question-prompt"
                  className="text-xs font-semibold text-navy-soft"
                >
                  Question prompt
                </label>
                <Textarea
                  id="question-prompt"
                  placeholder="Enter the question prompt..."
                  value={form.prompt}
                  onChange={(event) =>
                    updateField("prompt", event.target.value)
                  }
                  rows={3}
                  className="w-full resize-y"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label
                    htmlFor="question-section"
                    className="text-xs font-semibold text-navy-soft"
                  >
                    Section
                  </label>
                  <Select
                    id="question-section"
                    value={form.sectionId}
                    onChange={(event) =>
                      updateField("sectionId", event.target.value)
                    }
                  >
                    <option value="">Select section</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.title}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="question-type"
                    className="text-xs font-semibold text-navy-soft"
                  >
                    Question type
                  </label>
                  <Select
                    id="question-type"
                    value={form.type}
                    onChange={(event) =>
                      updateField("type", event.target.value)
                    }
                  >
                    {QUESTION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="question-order"
                    className="text-xs font-semibold text-navy-soft"
                  >
                    Display order
                  </label>
                  <Input
                    id="question-order"
                    placeholder="0"
                    type="number"
                    value={form.order}
                    onChange={(event) =>
                      updateField("order", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="question-required"
                    className="text-xs font-semibold text-navy-soft"
                  >
                    Required
                  </label>
                  <Select
                    id="question-required"
                    value={form.isRequired}
                    onChange={(event) =>
                      updateField("isRequired", event.target.value)
                    }
                  >
                    <option value="false">Optional</option>
                    <option value="true">Required</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="question-status"
                    className="text-xs font-semibold text-navy-soft"
                  >
                    Status
                  </label>
                  <Select
                    id="question-status"
                    value={form.isActive}
                    onChange={(event) =>
                      updateField("isActive", event.target.value)
                    }
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="question-ml-weight"
                    className="text-xs font-semibold text-navy-soft"
                  >
                    ML weight
                  </label>
                  <Input
                    id="question-ml-weight"
                    placeholder="0-1"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={form.mlWeight}
                    onChange={(event) =>
                      updateField("mlWeight", event.target.value)
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="question-dealbreaker"
                    className="text-xs font-semibold text-navy-soft"
                  >
                    Dealbreaker
                  </label>
                  <Select
                    id="question-dealbreaker"
                    value={form.isDealbreaker}
                    onChange={(event) =>
                      updateField("isDealbreaker", event.target.value)
                    }
                  >
                    <option value="false">Not a dealbreaker</option>
                    <option value="true">Dealbreaker</option>
                  </Select>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="question-helper-text"
                className="text-xs font-semibold text-navy-soft"
              >
                Helper text
              </label>
              <Textarea
                id="question-helper-text"
                value={form.helperText}
                onChange={(event) =>
                  updateField("helperText", event.target.value)
                }
              />
            </div>
            {[
              "DROPDOWN",
              "RADIO_7",
              "CHECKBOXES",
              "POINT_ALLOCATION",
              "RANKING",
            ].includes(form.type) ? (
              <div className="space-y-2">
                <label
                  htmlFor="question-options"
                  className="text-xs font-semibold text-navy-soft"
                >
                  {form.type === "POINT_ALLOCATION" || form.type === "RANKING"
                    ? "Items"
                    : "Options"}
                </label>
                {optionHelp ? (
                  <p className="text-xs text-navy-soft">{optionHelp}</p>
                ) : null}
                <Textarea
                  id="question-options"
                  value={optionLines}
                  onChange={(event) => setOptionLines(event.target.value)}
                  rows={6}
                />
              </div>
            ) : null}
            {form.type === "CHECKBOXES" ? (
              <div className="space-y-2">
                <label
                  htmlFor="checkbox-max-selections"
                  className="text-xs font-semibold text-navy-soft"
                >
                  Max selections (optional)
                </label>
                <p className="text-xs text-navy-soft">
                  Leave blank to allow unlimited selections.
                </p>
                <Input
                  id="checkbox-max-selections"
                  type="number"
                  min={1}
                  placeholder="e.g. 3"
                  value={checkboxMaxSelections}
                  onChange={(event) =>
                    setCheckboxMaxSelections(event.target.value)
                  }
                />
              </div>
            ) : null}
            {form.type === "POINT_ALLOCATION" ? (
              <div className="space-y-2">
                <label
                  htmlFor="question-point-total"
                  className="text-xs font-semibold text-navy-soft"
                >
                  Total points to allocate
                </label>
                <Input
                  id="question-point-total"
                  type="number"
                  min={1}
                  value={pointAllocationTotal}
                  onChange={(event) =>
                    setPointAllocationTotal(event.target.value)
                  }
                />
              </div>
            ) : null}
            {form.type === "NUMBER_SCALE" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label
                    htmlFor="scale-min"
                    className="text-xs font-semibold text-navy-soft"
                  >
                    Min value
                  </label>
                  <Input
                    id="scale-min"
                    type="number"
                    placeholder="1"
                    value={scaleOptions.min}
                    onChange={(event) =>
                      setScaleOptions((prev) => ({
                        ...prev,
                        min: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="scale-max"
                    className="text-xs font-semibold text-navy-soft"
                  >
                    Max value
                  </label>
                  <Input
                    id="scale-max"
                    type="number"
                    placeholder="10"
                    value={scaleOptions.max}
                    onChange={(event) =>
                      setScaleOptions((prev) => ({
                        ...prev,
                        max: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="scale-step"
                    className="text-xs font-semibold text-navy-soft"
                  >
                    Step
                  </label>
                  <Input
                    id="scale-step"
                    type="number"
                    placeholder="1"
                    value={scaleOptions.step}
                    onChange={(event) =>
                      setScaleOptions((prev) => ({
                        ...prev,
                        step: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="scale-min-label"
                    className="text-xs font-semibold text-navy-soft"
                  >
                    Min label
                  </label>
                  <Input
                    id="scale-min-label"
                    placeholder="e.g. Strongly disagree"
                    value={scaleOptions.minLabel}
                    onChange={(event) =>
                      setScaleOptions((prev) => ({
                        ...prev,
                        minLabel: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="scale-max-label"
                    className="text-xs font-semibold text-navy-soft"
                  >
                    Max label
                  </label>
                  <Input
                    id="scale-max-label"
                    placeholder="e.g. Strongly agree"
                    value={scaleOptions.maxLabel}
                    onChange={(event) =>
                      setScaleOptions((prev) => ({
                        ...prev,
                        maxLabel: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            ) : null}
            {form.type === "AGE_RANGE" ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-navy-soft">
                  Age range configuration (users will select min and max age
                  from dropdowns)
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="age-min" className="text-xs text-navy-soft">
                      Default minimum age
                    </label>
                    <Select
                      id="age-min"
                      value={ageRangeOptions.minAge}
                      onChange={(event) =>
                        setAgeRangeOptions((prev) => ({
                          ...prev,
                          minAge: event.target.value,
                        }))
                      }
                    >
                      {AGE_OPTIONS.map((age) => (
                        <option key={age} value={age}>
                          {age}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="age-max" className="text-xs text-navy-soft">
                      Default maximum age
                    </label>
                    <Select
                      id="age-max"
                      value={ageRangeOptions.maxAge}
                      onChange={(event) =>
                        setAgeRangeOptions((prev) => ({
                          ...prev,
                          maxAge: event.target.value,
                        }))
                      }
                    >
                      {AGE_OPTIONS.map((age) => (
                        <option key={age} value={age}>
                          {age}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
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
          </>
        )}
      </Card>
    </div>
  );
}
