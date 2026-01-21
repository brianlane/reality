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

export default function QuestionnaireForm() {
  const router = useRouter();
  const { draft, updateDraft } = useApplicationDraft();
  const [sections, setSections] = useState<Section[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  useEffect(() => {
    if (draft.applicationId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync stored draft id
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
  }, [draft.applicationId, updateDraft]);

  useEffect(() => {
    if (!applicationId) {
      return;
    }
    const controller = new AbortController();

    const loadQuestions = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(
          `/api/applications/questionnaire?applicationId=${applicationId}`,
          { signal: controller.signal },
        );
        const json = await res.json();
        if (!res.ok || json?.error) {
          setStatus(
            json?.error?.message ??
              "You must be invited off the waitlist to continue.",
          );
          setIsLoading(false);
          return;
        }
        setSections(json.sections ?? []);
        setAnswers(json.answers ?? {});
        setIsLoading(false);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setStatus("Failed to load questionnaire.");
          setIsLoading(false);
        }
      }
    };

    loadQuestions();

    return () => controller.abort();
  }, [applicationId]);

  const questionsBySection = useMemo(
    () => sections.filter((section) => section.questions.length > 0),
    [sections],
  );

  function updateAnswer(questionId: string, next: AnswerState) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: next,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (!applicationId) {
      setStatus("Please continue your application from your invite link.");
      return;
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
        answers: payloadAnswers,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      setStatus(
        data?.error?.message ?? "Failed to save questionnaire answers.",
      );
      return;
    }

    updateDraft({ questionnaire: answers });
    router.push("/apply/photos");
  }

  if (isLoading) {
    return <p className="text-sm text-navy-soft">Loading questionnaire...</p>;
  }

  if (!applicationId) {
    return (
      <p className="text-sm text-navy-soft">
        Please use your invite link to continue the application.
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
      <Button type="submit">Save and continue</Button>
      {status && <p className="text-sm text-red-500">{status}</p>}
    </form>
  );
}
