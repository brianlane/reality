"use client";

import { useEffect, useState } from "react";
import sanitizeHtml from "sanitize-html";
import { Card } from "@/components/ui/card";
import { getAuthHeaders } from "@/lib/supabase/auth-headers";

type QuestionResponse = {
  id: string;
  prompt: string;
  type: string;
  order: number;
  value: unknown;
  richText: string | null;
  answeredAt: string;
};

type SectionData = {
  id: string;
  title: string;
  order: number;
  questions: QuestionResponse[];
};

type PageData = {
  id: string;
  title: string;
  order: number;
  sections: SectionData[];
};

type ResponseData = {
  applicant: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    applicationStatus: string;
  };
  totalAnswers: number;
  pages: PageData[];
};

function formatValue(value: unknown, type: string): string {
  if (value === null || value === undefined) return "—";

  // Arrays: Checkboxes (string[]) and Rankings (string[] in ranked order)
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    if (type === "RANKING") {
      // Rankings are stored as ordered string arrays
      return value.map((item, i) => `${i + 1}. ${item}`).join(", ");
    }
    return value.map(String).join(", ");
  }

  // Age range: stored as { min, max }
  if (type === "AGE_RANGE" && typeof value === "object") {
    const range = value as { min?: number; max?: number };
    if (range.min !== undefined && range.max !== undefined) {
      return `${range.min} – ${range.max}`;
    }
    if (range.min !== undefined) return `${range.min}+`;
    if (range.max !== undefined) return `Up to ${range.max}`;
    return "—";
  }

  // Point allocation: stored as { key: number }
  if (type === "POINT_ALLOCATION" && typeof value === "object") {
    const allocations = value as Record<string, number>;
    return Object.entries(allocations)
      .map(([key, val]) => `${key}: ${val}`)
      .join(", ");
  }

  return String(value);
}

function getTypeBadge(type: string): string {
  const map: Record<string, string> = {
    TEXT: "Text",
    TEXTAREA: "Text Area",
    RICH_TEXT: "Rich Text",
    DROPDOWN: "Dropdown",
    RADIO_7: "Radio",
    CHECKBOXES: "Checkbox",
    NUMBER_SCALE: "Scale",
    AGE_RANGE: "Age Range",
    POINT_ALLOCATION: "Points",
    RANKING: "Ranking",
  };
  return map[type] ?? type;
}

type AdminQuestionnaireResponsesProps = {
  applicantId: string;
};

export default function AdminQuestionnaireResponses({
  applicantId,
}: AdminQuestionnaireResponsesProps) {
  const [data, setData] = useState<ResponseData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadResponses() {
      setIsLoading(true);
      setError(null);

      try {
        const headers = await getAuthHeaders();
        if (!headers) {
          setError("Please sign in again.");
          setIsLoading(false);
          return;
        }

        const res = await fetch(
          `/api/admin/applications/${applicantId}/responses`,
          { headers, signal: controller.signal },
        );
        const json = await res.json();

        if (!res.ok || json?.error) {
          setError(json?.error?.message ?? "Failed to load responses.");
          setIsLoading(false);
          return;
        }

        setData(json);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("Failed to load responses.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadResponses();
    return () => controller.abort();
  }, [applicantId]);

  if (isLoading) {
    return (
      <Card>
        <p className="py-8 text-center text-sm text-navy-soft">
          Loading questionnaire responses...
        </p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      </Card>
    );
  }

  if (!data || data.totalAnswers === 0) {
    return (
      <Card>
        <p className="py-8 text-center text-sm text-gray-500">
          No questionnaire responses yet.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy">
          Questionnaire Responses ({data.totalAnswers} answers)
        </h2>
      </div>

      {data.pages.map((page) => (
        <Card key={page.id} className="space-y-4">
          <h3 className="text-base font-semibold text-navy">{page.title}</h3>

          {page.sections.map((section) => (
            <div key={section.id} className="space-y-3">
              <h4 className="text-sm font-medium text-navy-soft">
                {section.title}
              </h4>

              <div className="divide-y divide-slate-100">
                {section.questions.map((question) => (
                  <div key={question.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm font-medium text-navy">
                        {question.prompt}
                      </p>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        {getTypeBadge(question.type)}
                      </span>
                    </div>
                    {question.richText ? (
                      <div
                        className="prose prose-sm mt-1 max-w-none text-navy-soft"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHtml(question.richText, {
                            allowedTags: sanitizeHtml.defaults.allowedTags,
                            allowedAttributes:
                              sanitizeHtml.defaults.allowedAttributes,
                          }),
                        }}
                      />
                    ) : (
                      <p className="mt-1 text-sm text-navy-soft">
                        {formatValue(question.value, question.type)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}
