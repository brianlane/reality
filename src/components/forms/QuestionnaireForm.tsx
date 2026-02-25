"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useApplicationDraft } from "./useApplicationDraft";
import RichTextEditor from "./RichTextEditor";
import { ERROR_MESSAGES } from "@/lib/error-messages";

type QuestionType =
  | "TEXT"
  | "TEXTAREA"
  | "RICH_TEXT"
  | "DROPDOWN"
  | "RADIO_7"
  | "CHECKBOXES"
  | "NUMBER_SCALE"
  | "AGE_RANGE"
  | "POINT_ALLOCATION"
  | "RANKING";

type NumberScaleOptions = {
  min: number;
  max: number;
  step?: number;
  minLabel?: string;
  maxLabel?: string;
};

type PointAllocationOptions = {
  items: string[];
  total: number;
};

type RankingOptions = {
  items: string[];
};

type AgeRangeOptions = {
  minAge?: number;
  maxAge?: number;
};

type TextOptions = {
  validation: "number";
  min?: number;
  max?: number;
};

type CheckboxOptions = {
  options: string[];
  maxSelections?: number;
};

type Question = {
  id: string;
  prompt: string;
  helperText: string | null;
  type: QuestionType;
  options:
    | string[]
    | CheckboxOptions
    | NumberScaleOptions
    | AgeRangeOptions
    | PointAllocationOptions
    | RankingOptions
    | TextOptions
    | null;
  isRequired: boolean;
};

type Section = {
  id: string;
  pageId?: string;
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

// Helper function to check if a value is an affirmative consent response
// Negative patterns for consent validation
// Use word boundary regex to avoid matching substrings (e.g., "no" in "acknowledge")
const NEGATIVE_PATTERNS = [
  /\bno\b/, // Matches "no" as a word, not as part of another word
  /\bdecline\b/,
  /\bdo not\b/, // General catch-all for "I do not [verb]" negations
  /\bnot applicable\b/,
];

// Affirmative patterns - require explicit consent for consent pages
const AFFIRMATIVE_PATTERNS = [
  "i agree",
  "i consent",
  "i understand",
  "i confirm",
  "i acknowledge",
  "yes",
];

// Check if a single string value is affirmative consent
function isAffirmativeString(strValue: string): boolean {
  const normalized = strValue.toLowerCase().trim();
  if (!normalized) return false;

  // Check if the value matches any negative pattern
  for (const pattern of NEGATIVE_PATTERNS) {
    if (pattern.test(normalized)) {
      return false;
    }
  }

  // Check if the value matches any affirmative pattern
  for (const pattern of AFFIRMATIVE_PATTERNS) {
    if (normalized.includes(pattern)) {
      return true;
    }
  }

  // If no explicit affirmative pattern matched, reject
  return false;
}

// For CHECKBOXES questions, pass availableOptions to ensure ALL options are checked
function isAffirmativeConsent(
  value: unknown,
  availableOptions?: unknown[],
): boolean {
  if (!value) return false;

  // For checkboxes (arrays), check EACH selected option for affirmative content
  // An array with negative options like ["I do not consent"] should fail
  if (Array.isArray(value)) {
    if (value.length === 0) return false;
    // If available options are provided, ALL must be selected
    if (availableOptions && value.length !== availableOptions.length) {
      return false;
    }
    // All selected options must be affirmative
    return value.every((item) => isAffirmativeString(String(item)));
  }

  // For dropdown/text values, check if it's an affirmative response
  return isAffirmativeString(String(value));
}

// Question types that can express consent (checkboxes, dropdowns, radio buttons)
// These must match QuestionnaireQuestionType enum values in the Prisma schema
// Other types like TEXT, TEXTAREA, NUMBER_SCALE, AGE_RANGE, POINT_ALLOCATION are
// data-gathering questions that shouldn't be validated for consent patterns
const CONSENT_QUESTION_TYPES: QuestionType[] = [
  "CHECKBOXES",
  "DROPDOWN",
  "RADIO_7",
];

// Check if a page is a consent page (only pages with "Consent" in the title)
function isConsentPage(page: PageInfo | undefined): boolean {
  // If no page exists (non-paged questionnaire), not a consent page
  if (!page) return false;
  // Only pages with "consent" in the title require consent validation
  return page.title.toLowerCase().includes("consent");
}

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
  const [allSections, setAllSections] = useState<Section[]>(mockSections ?? []);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(
    mockAnswers ?? {},
  );
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const isResearchMode = mode === "research";
  const initialResumePageIdRef = useRef(draft.currentPageId);

  useEffect(() => {
    if (!previewMode) return;
    queueMicrotask(() => {
      setSections(mockSections ?? []);
      setAllSections(mockSections ?? []);
      setAnswers(mockAnswers ?? {});
    });
  }, [previewMode, mockSections, mockAnswers]);

  useEffect(() => {
    if (previewMode) {
      // Skip localStorage checks in preview mode
      return;
    }
    let cancelled = false;
    const persistRecoveredApplicationId = (nextId: string) => {
      if (typeof window !== "undefined") {
        const current = localStorage.getItem("applicationId");
        if (current !== nextId) {
          localStorage.setItem("applicationId", nextId);
        }
      }
      setApplicationId(nextId);
      updateDraft({ applicationId: nextId });
    };

    if (draft.applicationId) {
      queueMicrotask(() => setApplicationId(draft.applicationId ?? null));
      return;
    }
    if (typeof window !== "undefined") {
      const storedId = localStorage.getItem("applicationId");
      if (storedId) {
        persistRecoveredApplicationId(storedId);
        return;
      }
    }

    if (isResearchMode) {
      return;
    }

    const loadApplicantFromSession = async () => {
      try {
        const res = await fetch("/api/applicant/dashboard");
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.application?.id) {
          return;
        }
        if (cancelled) return;
        const recoveredId = String(json.application.id);
        persistRecoveredApplicationId(recoveredId);
      } catch {
        // Ignore and allow existing UI messaging to guide user.
      }
    };

    loadApplicantFromSession();
    return () => {
      cancelled = true;
    };
  }, [draft.applicationId, updateDraft, previewMode, isResearchMode]);

  useEffect(() => {
    if (previewMode) {
      // Skip API call in preview mode - use mock data
      return;
    }
    if (!applicationId) {
      return;
    }
    const controller = new AbortController();

    const tryRestoreResearchSession = async (): Promise<boolean> => {
      if (!isResearchMode || typeof window === "undefined") {
        return false;
      }

      const inviteCode = localStorage.getItem("researchInviteCode");
      if (!inviteCode) {
        return false;
      }

      try {
        const recoveryRes = await fetch(
          `/api/research/validate-invite?code=${encodeURIComponent(inviteCode)}`,
          { signal: controller.signal },
        );
        const recoveryJson = await recoveryRes.json().catch(() => null);

        if (!recoveryRes.ok || !recoveryJson?.applicationId) {
          return false;
        }

        const restoredApplicationId = String(recoveryJson.applicationId);
        localStorage.setItem("applicationId", restoredApplicationId);
        updateDraft({
          applicationId: restoredApplicationId,
          currentPageId: undefined,
          questionnaire: undefined,
        });
        setApplicationId(restoredApplicationId);
        setStatus(null);
        return true;
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return false;
        }
        return false;
      }
    };

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
          const requiresSignIn =
            !isResearchMode &&
            json?.error?.message === ERROR_MESSAGES.SIGN_IN_TO_CONTINUE;
          if (requiresSignIn) {
            router.push("/sign-in?next=/apply/questionnaire");
            setIsLoading(false);
            return;
          }

          // 403 in non-research mode means the cached applicationId belongs to
          // a different user (stale from a prior session). Clear it and let the
          // first effect recover the correct ID from the authenticated session.
          const isStaleId = res.status === 403 && !isResearchMode;
          if (isStaleId) {
            if (typeof window !== "undefined") {
              localStorage.removeItem("applicationId");
            }
            updateDraft({ applicationId: undefined, currentPageId: undefined });
            setApplicationId(null);
            setIsLoading(false);
            return;
          }

          const canRecoverFromStaleResearchSession =
            isResearchMode &&
            json?.error?.message === ERROR_MESSAGES.APP_NOT_FOUND_OR_INVITED;
          if (canRecoverFromStaleResearchSession) {
            const recovered = await tryRestoreResearchSession();
            if (recovered) {
              setIsLoading(false);
              return;
            }
          }

          setStatus(
            json?.error?.message ??
              (isResearchMode
                ? ERROR_MESSAGES.INVALID_RESEARCH_INVITE
                : ERROR_MESSAGES.SIGN_IN_TO_CONTINUE_APPLICATION),
          );
          setIsLoading(false);
          return;
        }

        const fetchedPages = json.pages ?? [];
        const fetchedSections = (json.sections ?? []) as Section[];
        setPages(fetchedPages);
        setAllSections(fetchedSections);
        setAnswers(json.answers ?? {});

        // Determine current page from draft or start at first page
        const resumePageId = initialResumePageIdRef.current;
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

        // Filter sections client-side by pageId to avoid a second request.
        if (pageId) {
          setSections(
            fetchedSections.filter(
              (section) => (section.pageId ?? null) === pageId,
            ),
          );
        } else {
          // No pages, fallback to all sections
          setSections(fetchedSections);
        }

        setIsLoading(false);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setStatus(ERROR_MESSAGES.FAILED_LOAD_QUESTIONNAIRE);
          setIsLoading(false);
        }
      }
    };

    loadQuestionnaire();

    return () => controller.abort();
  }, [applicationId, previewMode, isResearchMode, updateDraft, router]);

  const questionsBySection = useMemo(
    () => sections.filter((section) => section.questions.length > 0),
    [sections],
  );

  async function saveCurrentPageAnswers(): Promise<boolean> {
    if (previewMode) {
      setStatus(ERROR_MESSAGES.PREVIEW_MODE_SUBMIT_DISABLED);
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
        let value = answer.value ?? null;
        if (
          question.type === "RANKING" &&
          (!Array.isArray(value) || (value as unknown[]).length === 0)
        ) {
          const rankingOptions = question.options as {
            items?: string[];
          } | null;
          value = rankingOptions?.items ?? null;
        }
        return {
          questionId: question.id,
          value,
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
        data?.error?.message ??
          ERROR_MESSAGES.FAILED_SAVE_QUESTIONNAIRE_ANSWERS,
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

  function getTextOptions(question: Question): TextOptions | null {
    if (
      question.type === "TEXT" &&
      question.options &&
      typeof question.options === "object" &&
      !Array.isArray(question.options) &&
      "validation" in question.options &&
      question.options.validation === "number"
    ) {
      return question.options as TextOptions;
    }
    return null;
  }

  function validateCheckboxSelections(): boolean {
    const errors: Record<string, string> = {};

    for (const section of sections) {
      for (const question of section.questions) {
        if (question.type !== "CHECKBOXES" || !question.isRequired) continue;

        const rawOpts = question.options as CheckboxOptions | string[] | null;
        const maxSelections =
          !Array.isArray(rawOpts) &&
          rawOpts !== null &&
          typeof rawOpts === "object" &&
          "maxSelections" in rawOpts
            ? rawOpts.maxSelections
            : undefined;

        if (maxSelections === undefined) continue;

        const answer = answers[question.id];
        const selected = Array.isArray(answer?.value) ? answer.value : [];

        if (selected.length !== maxSelections) {
          errors[question.id] =
            `Please select exactly ${maxSelections} option${maxSelections === 1 ? "" : "s"}.`;
        }
      }
    }

    setFieldErrors((prev) => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  }

  function validateNumericFields(): boolean {
    const errors: Record<string, string> = {};

    for (const section of sections) {
      for (const question of section.questions) {
        const textOpts = getTextOptions(question);
        if (!textOpts) continue;

        const answer = answers[question.id];
        const value = String(answer?.value ?? "").trim();

        // Skip empty non-required fields
        if (!value && !question.isRequired) continue;
        if (!value && question.isRequired) {
          errors[question.id] = "This field is required.";
          continue;
        }

        const num = Number(value);
        if (isNaN(num)) {
          errors[question.id] = "Please enter a valid number.";
          continue;
        }

        if (textOpts.min !== undefined && num < textOpts.min) {
          errors[question.id] = `Value must be at least ${textOpts.min}.`;
          continue;
        }

        if (textOpts.max !== undefined && num > textOpts.max) {
          errors[question.id] = `Value must be at most ${textOpts.max}.`;
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    // Validate consent on consent pages before proceeding
    const currentPage = pages[currentPageIndex];
    if (isConsentPage(currentPage)) {
      // Check consent-type questions on this page for affirmative consent
      // Only CHECKBOX, DROPDOWN, RADIO types can express consent
      // TEXT, TEXTAREA, NUMBER_SCALE, AGE_RANGE, POINT_ALLOCATION are data questions
      for (const section of sections) {
        for (const question of section.questions) {
          // Skip questions that are not required
          if (!question.isRequired) continue;

          // Skip non-consent question types (TEXT, TEXTAREA, NUMBER_SCALE, etc.)
          if (!CONSENT_QUESTION_TYPES.includes(question.type)) continue;

          const answer = answers[question.id];
          const value = answer?.value;

          // For CHECKBOXES, pass available options so ALL must be checked
          const checkboxOptions =
            question.type === "CHECKBOXES"
              ? Array.isArray(question.options)
                ? (question.options as unknown[])
                : question.options !== null &&
                    typeof question.options === "object" &&
                    "options" in question.options
                  ? (question.options as CheckboxOptions).options
                  : undefined
              : undefined;

          // Check if the answer is affirmative
          if (!isAffirmativeConsent(value, checkboxOptions)) {
            setStatus(
              "Please provide affirmative consent for all required items to continue. " +
                "All checkboxes must be checked and all dropdown selections must indicate agreement.",
            );
            return;
          }
        }
      }
    }

    // Validate CHECKBOXES questions with exact selection requirements
    if (!validateCheckboxSelections()) {
      setStatus("Please fix the highlighted errors before continuing.");
      return;
    }

    // Validate numeric TEXT fields before saving
    if (!validateNumericFields()) {
      setStatus("Please fix the highlighted errors before continuing.");
      return;
    }

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
        const nextSections = allSections.filter(
          (section) => (section.pageId ?? null) === nextPageId,
        );
        setSections(nextSections);
        setCurrentPageIndex(nextPageIndex);
        updateDraft({ currentPageId: nextPageId });
        setFieldErrors({});

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
          : "Please sign in to continue your application."}
      </p>
    );
  }

  // Show API/load errors before the generic "not available" fallback.
  if (status && questionsBySection.length === 0) {
    return <p className="text-sm text-red-500">{status}</p>;
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
              const textOpts = getTextOptions(question);
              const isNumeric = !!textOpts;
              return (
                <div key={question.id} className="space-y-2">
                  <label className="text-sm font-medium text-navy-muted">
                    {question.prompt}
                  </label>
                  {question.helperText ? (
                    <p className="text-xs text-navy-soft">
                      {question.helperText}
                    </p>
                  ) : null}
                  <Input
                    type={isNumeric ? "number" : "text"}
                    inputMode={isNumeric ? "decimal" : undefined}
                    min={
                      isNumeric && textOpts?.min !== undefined
                        ? textOpts.min
                        : undefined
                    }
                    max={
                      isNumeric && textOpts?.max !== undefined
                        ? textOpts.max
                        : undefined
                    }
                    step={isNumeric ? "any" : undefined}
                    value={String(answer.value ?? "")}
                    required={question.isRequired}
                    onChange={(event) => {
                      updateAnswer(question.id, {
                        value: event.target.value,
                      });
                      if (fieldErrors[question.id]) {
                        setFieldErrors((prev) => {
                          const next = { ...prev };
                          delete next[question.id];
                          return next;
                        });
                      }
                    }}
                  />
                  {fieldErrors[question.id] ? (
                    <p className="text-xs text-red-500">
                      {fieldErrors[question.id]}
                    </p>
                  ) : null}
                </div>
              );
            }
            if (question.type === "TEXTAREA") {
              return (
                <div key={question.id} className="space-y-2">
                  <label className="text-sm font-medium text-navy-muted">
                    {question.prompt}
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
                    {options.map((option, idx) => (
                      <option key={`${option}-${idx}`} value={option}>
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
                  </label>
                  {question.helperText ? (
                    <p className="text-xs text-navy-soft">
                      {question.helperText}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-4">
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
              const checkboxOpts = question.options as
                | CheckboxOptions
                | string[]
                | null;
              const options = Array.isArray(checkboxOpts)
                ? checkboxOpts
                : checkboxOpts !== null &&
                    typeof checkboxOpts === "object" &&
                    "options" in checkboxOpts
                  ? checkboxOpts.options
                  : [];
              const maxSelections =
                !Array.isArray(checkboxOpts) &&
                checkboxOpts !== null &&
                typeof checkboxOpts === "object" &&
                "maxSelections" in checkboxOpts
                  ? checkboxOpts.maxSelections
                  : undefined;
              const selected = Array.isArray(answer.value) ? answer.value : [];
              const limitReached =
                maxSelections !== undefined && selected.length >= maxSelections;
              return (
                <div key={question.id} className="space-y-2">
                  <label className="text-sm font-medium text-navy-muted">
                    {question.prompt}
                  </label>
                  {question.helperText ? (
                    <p className="text-xs text-navy-soft">
                      {question.helperText}
                    </p>
                  ) : null}
                  {maxSelections !== undefined ? (
                    <p className="text-xs text-navy-soft">
                      Select exactly {maxSelections} ({selected.length}/
                      {maxSelections} selected)
                    </p>
                  ) : null}
                  <div className="space-y-2">
                    {options.map((option) => {
                      const isChecked = selected.includes(option);
                      const isDisabled = limitReached && !isChecked;
                      return (
                        <label
                          key={option}
                          className={`flex items-center gap-2 text-sm ${isDisabled ? "opacity-40 cursor-not-allowed" : "text-navy-soft"}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isDisabled}
                            onChange={(event) => {
                              const next = event.target.checked
                                ? [...selected, option]
                                : selected.filter((item) => item !== option);
                              updateAnswer(question.id, { value: next });
                              if (fieldErrors[question.id]) {
                                setFieldErrors((prev) => {
                                  const updated = { ...prev };
                                  delete updated[question.id];
                                  return updated;
                                });
                              }
                            }}
                          />
                          {option}
                        </label>
                      );
                    })}
                  </div>
                  {fieldErrors[question.id] ? (
                    <p className="text-xs text-red-500">
                      {fieldErrors[question.id]}
                    </p>
                  ) : null}
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
            if (question.type === "AGE_RANGE") {
              const ageOptions = question.options as AgeRangeOptions | null;
              const minAge = ageOptions?.minAge ?? 18;
              const maxAge = ageOptions?.maxAge ?? 80;
              // Generate age options based on configured range
              const ageChoices = Array.from(
                { length: maxAge - minAge + 1 },
                (_, i) => i + minAge,
              );
              const ageValue =
                (answer.value as { min?: number; max?: number }) ?? {};
              return (
                <div key={question.id} className="space-y-2">
                  <label className="text-sm font-medium text-navy-muted">
                    {question.prompt}
                  </label>
                  {question.helperText ? (
                    <p className="text-xs text-navy-soft">
                      {question.helperText}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-navy-soft">From</span>
                      <Select
                        value={String(ageValue.min ?? "")}
                        required={question.isRequired}
                        onChange={(event) => {
                          const val = event.target.value;
                          updateAnswer(question.id, {
                            value: {
                              ...ageValue,
                              min: val === "" ? undefined : Number(val),
                            },
                          });
                        }}
                      >
                        <option value="">Select...</option>
                        {ageChoices.map((age) => (
                          <option key={age} value={age}>
                            {age}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-navy-soft">To</span>
                      <Select
                        value={String(ageValue.max ?? "")}
                        required={question.isRequired}
                        onChange={(event) => {
                          const val = event.target.value;
                          updateAnswer(question.id, {
                            value: {
                              ...ageValue,
                              max: val === "" ? undefined : Number(val),
                            },
                          });
                        }}
                      >
                        <option value="">Select...</option>
                        {ageChoices.map((age) => (
                          <option key={age} value={age}>
                            {age}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                </div>
              );
            }
            if (question.type === "POINT_ALLOCATION") {
              const options = question.options as PointAllocationOptions | null;
              const items = options?.items ?? [];
              const total = options?.total ?? 100;
              const allocations =
                (answer.value as Record<string, number>) ?? {};
              const currentTotal = Object.values(allocations).reduce(
                (sum, val) => sum + (val || 0),
                0,
              );
              const remaining = total - currentTotal;

              return (
                <div key={question.id} className="space-y-4">
                  <label className="text-sm font-medium text-navy-muted">
                    {question.prompt}
                  </label>
                  {question.helperText ? (
                    <p className="text-xs text-navy-soft">
                      {question.helperText}
                    </p>
                  ) : null}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="space-y-3">
                      {items.map((item, idx) => (
                        <div
                          key={`${item}-${idx}`}
                          className="flex items-center justify-between gap-4 rounded-md bg-white px-4 py-3 shadow-sm"
                        >
                          <span className="text-sm font-medium text-navy-muted">
                            {item}
                          </span>
                          <div className="flex shrink-0 items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              max={total}
                              className="w-20 min-w-[5rem] text-center"
                              value={allocations[item] ?? ""}
                              onChange={(event) => {
                                const newValue = Math.max(
                                  0,
                                  Math.min(
                                    total,
                                    parseInt(event.target.value) || 0,
                                  ),
                                );
                                updateAnswer(question.id, {
                                  value: { ...allocations, [item]: newValue },
                                });
                              }}
                            />
                            <span className="text-sm text-navy-soft">pts</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div
                      className={`mt-4 flex items-center justify-between border-t border-gray-200 pt-4 ${remaining === 0 ? "text-green-600" : remaining < 0 ? "text-red-500" : "text-navy-soft"}`}
                    >
                      <span className="text-sm font-semibold">
                        Remaining: {remaining} points
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${remaining === 0 ? "bg-green-100 text-green-700" : remaining < 0 ? "bg-red-100 text-red-700" : "bg-gray-200 text-gray-700"}`}
                      >
                        {currentTotal} / {total}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }
            if (question.type === "RANKING") {
              const options = question.options as RankingOptions | null;
              const items = options?.items ?? [];
              const rankedItems = Array.isArray(answer.value)
                ? (answer.value as string[])
                : [...items];

              // Parse helper text into definitions if it contains bullet points
              const definitions: { term: string; definition: string }[] = [];
              if (question.helperText) {
                const parts = question.helperText.split("•").filter(Boolean);
                parts.forEach((part) => {
                  const colonIndex = part.indexOf(":");
                  if (colonIndex > 0) {
                    definitions.push({
                      term: part.substring(0, colonIndex).trim(),
                      definition: part.substring(colonIndex + 1).trim(),
                    });
                  }
                });
              }

              const handleDragStart = (
                e: React.DragEvent<HTMLDivElement>,
                index: number,
              ) => {
                e.dataTransfer.setData("text/plain", String(index));
                e.dataTransfer.effectAllowed = "move";
              };

              const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              };

              const handleDrop = (
                e: React.DragEvent<HTMLDivElement>,
                dropIndex: number,
              ) => {
                e.preventDefault();
                const dragIndex = parseInt(
                  e.dataTransfer.getData("text/plain"),
                );
                if (dragIndex === dropIndex) return;

                const newItems = [...rankedItems];
                const [draggedItem] = newItems.splice(dragIndex, 1);
                newItems.splice(dropIndex, 0, draggedItem);
                updateAnswer(question.id, { value: newItems });
              };

              return (
                <div key={question.id} className="space-y-4">
                  <label className="text-sm font-medium text-navy-muted">
                    {question.prompt}
                  </label>
                  {definitions.length > 0 ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Quality Definitions
                      </p>
                      <div className="grid gap-2">
                        {definitions.map((def, idx) => (
                          <div
                            key={`def-${idx}`}
                            className="flex gap-2 text-xs"
                          >
                            <span className="font-semibold text-navy-muted">
                              {def.term}:
                            </span>
                            <span className="text-navy-soft">
                              {def.definition}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : question.helperText ? (
                    <p className="text-xs text-navy-soft">
                      {question.helperText}
                    </p>
                  ) : null}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-3 text-xs font-medium text-gray-500">
                      Drag and drop to reorder
                    </p>
                    <div className="space-y-2">
                      {rankedItems.map((item, index) => (
                        <div
                          key={`rank-${item}-${index}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, index)}
                          className="flex cursor-move items-center gap-3 rounded-md bg-white px-4 py-3 shadow-sm transition-all hover:shadow-md active:scale-[0.99]"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-copper text-sm font-bold text-white">
                            {index + 1}
                          </span>
                          <span className="flex-1 text-sm font-medium text-navy-muted">
                            {item}
                          </span>
                          <span className="text-gray-300">⋮⋮</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      ))}
      <div className="flex justify-end">
        <Button type="submit">Save and Continue</Button>
      </div>
      {status && <p className="text-sm text-red-500">{status}</p>}
    </form>
  );
}
