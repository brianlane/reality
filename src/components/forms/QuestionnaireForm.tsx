"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useApplicationDraft } from "./useApplicationDraft";
import RichTextEditor from "./RichTextEditor";

type QuestionType =
  | "TEXT"
  | "TEXTAREA"
  | "RICH_TEXT"
  | "DROPDOWN"
  | "RADIO_7"
  | "CHECKBOXES"
  | "NUMBER_SCALE";

type NumberScaleOptions = {
  min: number;
  max: number;
  step?: number;
  minLabel?: string;
  maxLabel?: string;
};

type Question = {
  id: string;
  prompt: string;
  helperText: string | null;
  type: QuestionType;
  options: string[] | NumberScaleOptions | null;
  isRequired: boolean;
};

type Section = {
  id: string;
  title: string;
  description: string | null;
  questions: Question[];
};

type AnswerState = {
  value: unknown;
  richText?: string | null;
};

type PageInfo = {
  id: string;
  title: string;
  order: number;
};

export default function QuestionnaireForm({
  previewMode = false,
  mockSections,
  mockAnswers,
  mode = "application",
}: {
  previewMode?: boolean;
  mockSections?: Section[];
  mockAnswers?: Record<string, AnswerState>;
  mode?: "application" | "research";
}) {
  const router = useRouter();
  const { draft, updateDraft } = useApplicationDraft();
  const [sections, setSections] = useState<Section[]>(mockSections ?? []);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(
    mockAnswers ?? {},
  );
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const isResearchMode = mode === "research";

  useEffect(() => {
    if (!previewMode) return;
    setSections(mockSections ?? []);
    setAnswers(mockAnswers ?? {});
  }, [previewMode, mockSections, mockAnswers]);

  useEffect(() => {
    if (previewMode) {
      // Skip localStorage checks in preview mode
      return;
    }
    if (draft.applicationId) {
      setApplicationId(draft.applicationId);
      return;
    }
    if (typeof window !== "undefined") {
      const storedId = localStorage.getItem("applicationId");
      if (storedId) {
        setApplicationId(storedId);
        updateDraft({ applicationId: storedId });
      }
    }
  }, [draft.applicationId, updateDraft, previewMode]);

  useEffect(() => {
    if (previewMode) {
      // Skip API call in preview mode - use mock data
      return;
    }
    if (!applicationId) {
      return;
    }
    const controller = new AbortController();

    const loadQuestionnaire = async () => {
      try {
        setIsLoading(true);
        // First, fetch all pages and answers to determine current page
        const res = await fetch(
          `/api/applications/questionnaire?applicationId=${applicationId}`,
          { signal: controller.signal },
        );
        const json = await res.json();
        if (!res.ok || json?.error) {
          setStatus(
            json?.error?.message ??
              (isResearchMode
                ? "Your research invite is not valid."
                : "You must be invited off the waitlist to continue."),
          );
          setIsLoading(false);
          return;
        }

        const fetchedPages = json.pages ?? [];
        setPages(fetchedPages);
        setAnswers(json.answers ?? {});

        // Determine current page from draft or start at first page
        const resumePageId = draft.currentPageId;
        let pageIndex = 0;
        let pageId: string | null = null;

        if (resumePageId && fetchedPages.length > 0) {
          const foundIndex = fetchedPages.findIndex(
            (p: PageInfo) => p.id === resumePageId,
          );
          if (foundIndex !== -1) {
            pageIndex = foundIndex;
            pageId = resumePageId;
          }
        }

        if (!pageId && fetchedPages.length > 0) {
          pageIndex = 0;
          pageId = fetchedPages[0].id;
        }

        setCurrentPageIndex(pageIndex);

        // Now fetch sections for the current page
        if (pageId) {
          const sectionsRes = await fetch(
            `/api/applications/questionnaire?applicationId=${applicationId}&pageId=${pageId}`,
            { signal: controller.signal },
          );
          const sectionsJson = await sectionsRes.json();
          if (!sectionsRes.ok || sectionsJson?.error) {
            setStatus("Failed to load questionnaire sections.");
            setIsLoading(false);
            return;
          }
          setSections(sectionsJson.sections ?? []);
        } else {
          // No pages, fallback to all sections
          setSections(json.sections ?? []);
        }

        setIsLoading(false);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setStatus("Failed to load questionnaire.");
          setIsLoading(false);
        }
      }
    };

    loadQuestionnaire();

    return () => controller.abort();
  }, [applicationId, previewMode, draft.currentPageId, isResearchMode]);

  const questionsBySection = useMemo(
    () => sections.filter((section) => section.questions.length > 0),
    [sections],
  );

  async function saveCurrentPageAnswers(): Promise<boolean> {
    if (previewMode) {
      setStatus("Preview mode - form submission is disabled");
      return false;
    }
    if (!applicationId) {
      setStatus(
        isResearchMode
          ? "Please use your research invite link to begin."
          : "Please continue your application from your invite link.",
      );
      return false;
    }

    const payloadAnswers = sections.flatMap((section) =>
      section.questions.map((question) => {
        const answer = answers[question.id] ?? { value: null, richText: null };
        return {
          questionId: question.id,
          value: answer.value ?? null,
          richText: answer.richText ?? null,
        };
      }),
    );

    const response = await fetch("/api/applications/questionnaire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicationId,
        pageId: pages[currentPageIndex]?.id ?? undefined,
        answers: payloadAnswers,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.error) {
      setStatus(
        data?.error?.message ?? "Failed to save questionnaire answers.",
      );
      return false;
    }

    updateDraft({ questionnaire: answers });
    return true;
  }

  function updateAnswer(questionId: string, next: AnswerState) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: next,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    const saved = await saveCurrentPageAnswers();
    if (!saved) {
      return;
    }

    // Check if this is the last page
    const isLastPage =
      pages.length === 0 || currentPageIndex >= pages.length - 1;

    if (isLastPage) {
      if (isResearchMode) {
        const response = await fetch("/api/research/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicationId }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.error) {
          setStatus(
            data?.error?.message ??
              "Failed to complete the research questionnaire.",
          );
          return;
        }
        router.push("/research/thank-you");
      } else {
        // Navigate to photos page
        router.push("/apply/photos");
      }
    } else {
      // Move to next page
      const nextPageIndex = currentPageIndex + 1;
      const nextPageId = pages[nextPageIndex]?.id;

      if (nextPageId) {
        // Load next page sections
        setIsLoading(true);
        let nextLoaded = false;
        try {
          const res = await fetch(
            `/api/applications/questionnaire?applicationId=${applicationId}&pageId=${nextPageId}`,
          );
          const json = await res.json();
          if (!res.ok || json?.error) {
            setStatus("Failed to load next page.");
            return;
          }
          setSections(json.sections ?? []);
          setCurrentPageIndex(nextPageIndex);
          updateDraft({ currentPageId: nextPageId });
          nextLoaded = true;
        } catch {
          setStatus("Failed to load next page.");
        } finally {
          setIsLoading(false);
        }

        if (nextLoaded) {
          // Scroll to top
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
    }
  }

  async function handlePrevious() {
    if (currentPageIndex <= 0 || pages.length === 0) return;

    const prevPageIndex = currentPageIndex - 1;
    const prevPageId = pages[prevPageIndex]?.id;

    if (prevPageId) {
      const saved = await saveCurrentPageAnswers();
      if (!saved) {
        return;
      }

      // Load previous page sections
      setIsLoading(true);
      let prevLoaded = false;
      try {
        const res = await fetch(
          `/api/applications/questionnaire?applicationId=${applicationId}&pageId=${prevPageId}`,
        );
        const json = await res.json();
        if (!res.ok || json?.error) {
          setStatus("Failed to load previous page.");
          return;
        }
        setSections(json.sections ?? []);
        setCurrentPageIndex(prevPageIndex);
        updateDraft({ currentPageId: prevPageId });
        prevLoaded = true;
      } catch {
        setStatus("Failed to load previous page.");
      } finally {
        setIsLoading(false);
      }

      if (prevLoaded) {
        // Scroll to top
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }

  if (isLoading) {
    return <p className="text-sm text-navy-soft">Loading questionnaire...</p>;
  }

  if (!previewMode && !applicationId) {
    return (
      <p className="text-sm text-navy-soft">
        {isResearchMode
          ? "Please use your research invite link to begin."
          : "Please use your invite link to continue the application."}
      </p>
    );
  }

  if (questionsBySection.length === 0) {
    return (
      <p className="text-sm text-navy-soft">
        The questionnaire is not available yet. Please check back later.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {!previewMode && pages.length > 0 && (
        <div className="rounded-md bg-slate-50 p-4">
          <div className="text-sm font-medium text-navy">
            Page {currentPageIndex + 1} of {pages.length}
          </div>
          <div className="mt-2 text-xs text-navy-soft">
            {pages[currentPageIndex]?.title}
          </div>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-copper transition-all"
              style={{
                width: `${((currentPageIndex + 1) / pages.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
      {questionsBySection.map((section) => (
        <div key={section.id} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-navy">{section.title}</h2>
            {section.description ? (
              <p className="text-sm text-navy-soft">{section.description}</p>
            ) : null}
          </div>
          {section.questions.map((question) => {
            const answer = answers[question.id] ?? {
              value: "",
              richText: null,
            };
            if (question.type === "TEXT") {
              return (
                <div key={question.id} className="space-y-2">
                  <label className="text-sm font-medium text-navy-muted">
                    {question.prompt}
                    {question.isRequired ? " *" : ""}
                  </label>
                  {question.helperText ? (
                    <p className="text-xs text-navy-soft">
                      {question.helperText}
                    </p>
                  ) : null}
                  <Input
                    value={String(answer.value ?? "")}
                    required={question.isRequired}
                    onChange={(event) =>
                      updateAnswer(question.id, { value: event.target.value })
                    }
                  />
                </div>
              );
            }
            if (question.type === "TEXTAREA") {
              return (
                <div key={question.id} className="space-y-2">
                  <label className="text-sm font-medium text-navy-muted">
                    {question.prompt}
                    {question.isRequired ? " *" : ""}
                  </label>
                  {question.helperText ? (
                    <p className="text-xs text-navy-soft">
                      {question.helperText}
                    </p>
                  ) : null}
                  <Textarea
                    rows={4}
                    value={String(answer.value ?? "")}
                    required={question.isRequired}
                    onChange={(event) =>
                      updateAnswer(question.id, { value: event.target.value })
                    }
                  />
                </div>
              );
            }
            if (question.type === "RICH_TEXT") {
              return (
                <div key={question.id} className="space-y-2">
                  <label className="text-sm font-medium text-navy-muted">
                    {question.prompt}
                    {question.isRequired ? " *" : ""}
                  </label>
                  {question.helperText ? (
                    <p className="text-xs text-navy-soft">
                      {question.helperText}
                    </p>
                  ) : null}
                  <RichTextEditor
                    value={String(answer.value ?? "")}
                    onChange={(value) =>
                      updateAnswer(question.id, {
                        value,
                        richText: value,
                      })
                    }
                  />
                </div>
              );
            }
            if (question.type === "DROPDOWN") {
              const options = Array.isArray(question.options)
                ? question.options
                : [];
              return (
                <div key={question.id} className="space-y-2">
                  <label className="text-sm font-medium text-navy-muted">
                    {question.prompt}
                    {question.isRequired ? " *" : ""}
                  </label>
                  {question.helperText ? (
                    <p className="text-xs text-navy-soft">
                      {question.helperText}
                    </p>
                  ) : null}
                  <Select
                    value={String(answer.value ?? "")}
                    required={question.isRequired}
                    onChange={(event) =>
                      updateAnswer(question.id, { value: event.target.value })
                    }
                  >
                    <option value="">Select...</option>
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </div>
              );
            }
            if (question.type === "RADIO_7") {
              const options = Array.isArray(question.options)
                ? question.options
                : [];
              return (
                <div key={question.id} className="space-y-2">
                  <label className="text-sm font-medium text-navy-muted">
                    {question.prompt}
                    {question.isRequired ? " *" : ""}
                  </label>
                  {question.helperText ? (
                    <p className="text-xs text-navy-soft">
                      {question.helperText}
                    </p>
                  ) : null}
                  <div className="space-y-2">
                    {options.map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-2 text-sm text-navy-soft"
                      >
                        <input
                          type="radio"
                          name={`radio-${question.id}`}
                          value={option}
                          checked={answer.value === option}
                          required={question.isRequired}
                          onChange={() =>
                            updateAnswer(question.id, { value: option })
                          }
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              );
            }
            if (question.type === "CHECKBOXES") {
              const options = Array.isArray(question.options)
                ? question.options
                : [];
              const selected = Array.isArray(answer.value) ? answer.value : [];
              return (
                <div key={question.id} className="space-y-2">
                  <label className="text-sm font-medium text-navy-muted">
                    {question.prompt}
                    {question.isRequired ? " *" : ""}
                  </label>
                  {question.helperText ? (
                    <p className="text-xs text-navy-soft">
                      {question.helperText}
                    </p>
                  ) : null}
                  <div className="space-y-2">
                    {options.map((option) => (
                      <label
                        key={option}
                        className="flex items-center gap-2 text-sm text-navy-soft"
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(option)}
                          onChange={(event) => {
                            const next = event.target.checked
                              ? [...selected, option]
                              : selected.filter((item) => item !== option);
                            updateAnswer(question.id, { value: next });
                          }}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              );
            }
            if (question.type === "NUMBER_SCALE") {
              const options = question.options as NumberScaleOptions;
              const minLabel = options?.minLabel ?? `${options?.min ?? 1}`;
              const maxLabel = options?.maxLabel ?? `${options?.max ?? 10}`;
              return (
                <div key={question.id} className="space-y-2">
                  <label className="text-sm font-medium text-navy-muted">
                    {question.prompt}
                    {question.isRequired ? " *" : ""}
                  </label>
                  {question.helperText ? (
                    <p className="text-xs text-navy-soft">
                      {question.helperText}
                    </p>
                  ) : null}
                  <div className="flex flex-col gap-2">
                    <Input
                      type="number"
                      min={options?.min ?? 1}
                      max={options?.max ?? 10}
                      step={options?.step ?? 1}
                      value={String(answer.value ?? "")}
                      required={question.isRequired}
                      onChange={(event) =>
                        updateAnswer(question.id, {
                          value: event.target.value,
                        })
                      }
                    />
                    <div className="flex justify-between text-xs text-navy-soft">
                      <span>{minLabel}</span>
                      <span>{maxLabel}</span>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      ))}
      {previewMode ? (
        <Button type="submit">Save and Continue</Button>
      ) : (
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={currentPageIndex === 0 || pages.length === 0}
          >
            Previous
          </Button>

          <Button type="submit">Save and Continue</Button>
        </div>
      )}
      {status && <p className="text-sm text-red-500">{status}</p>}
    </form>
  );
}
