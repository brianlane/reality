"use client";

import { useRef, useState, useEffect } from "react";
import QuestionnaireForm from "@/components/forms/QuestionnaireForm";
import { MOCK_APPLICATION_ID } from "./mockData";
import { PreviewDraftProvider } from "./PreviewDraftProvider";

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
  order: number;
};

type Section = {
  id: string;
  title: string;
  description: string | null;
  order: number;
  questions: Question[];
};

type PageInfo = {
  id: string;
  title: string;
  order: number;
};

export default function PreviewQuestionnaire() {
  const [allSections, setAllSections] = useState<Section[]>([]);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const sectionsCache = useRef<Map<string, Section[]>>(new Map());

  useEffect(() => {
    const controller = new AbortController();
    let isMounted = true;

    const loadQuestionnaire = async () => {
      try {
        if (isMounted) {
          setLoading(true);
        }
        const res = await fetch(
          `/api/applications/questionnaire?applicationId=${MOCK_APPLICATION_ID}`,
          { signal: controller.signal },
        );
        const json = await res.json();

        if (!res.ok || json?.error) {
          if (isMounted) {
            setError("No questionnaire configured yet");
            setLoading(false);
          }
          return;
        }

        const pagesData = json.pages ?? [];
        if (isMounted) {
          setPages(pagesData);
        }

        if (pagesData.length === 0) {
          if (isMounted) {
            setAllSections(json.sections ?? []);
            setLoading(false);
          }
          return;
        }

        const pageResults = await Promise.all(
          pagesData.map(async (page: PageInfo) => {
            const res = await fetch(
              `/api/applications/questionnaire?applicationId=${MOCK_APPLICATION_ID}&pageId=${page.id}`,
              { signal: controller.signal },
            );
            const pageJson = await res.json();
            return {
              pageId: page.id,
              sections:
                res.ok && !pageJson?.error ? (pageJson.sections ?? []) : [],
            };
          }),
        );

        if (isMounted) {
          pageResults.forEach(({ pageId, sections }) => {
            sectionsCache.current.set(pageId, sections);
          });
        }

        const firstPageId = pagesData[0]?.id;
        if (isMounted) {
          setAllSections(
            firstPageId ? (sectionsCache.current.get(firstPageId) ?? []) : [],
          );
          setLoading(false);
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
        if (isMounted) {
          setError("Failed to load questionnaire");
          setLoading(false);
        }
      }
    };

    loadQuestionnaire();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // Load sections when page changes
  useEffect(() => {
    if (pages.length === 0 || currentPageIndex >= pages.length) return;

    const controller = new AbortController();
    let isMounted = true;

    const loadPageSections = async () => {
      try {
        const pageId = pages[currentPageIndex].id;
        const cached = sectionsCache.current.get(pageId);
        if (cached) {
          if (isMounted) {
            setAllSections(cached);
          }
          return;
        }
        const res = await fetch(
          `/api/applications/questionnaire?applicationId=${MOCK_APPLICATION_ID}&pageId=${pageId}`,
          { signal: controller.signal },
        );
        const json = await res.json();
        if (res.ok && !json?.error) {
          const nextSections = json.sections ?? [];
          sectionsCache.current.set(pageId, nextSections);
          if (isMounted) {
            setAllSections(nextSections);
          }
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
        console.error("Failed to load page sections:", error);
      }
    };

    loadPageSections();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [currentPageIndex, pages]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Preview Mode:</strong> Loading questionnaire configuration
            from database...
          </p>
        </div>
      </div>
    );
  }

  const sections = allSections;

  if (error || sections.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Preview Mode:</strong> This is Stage 6 - Questionnaire.
            Applicants answer custom questions configured by the admin.
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> No questionnaire configured yet. Go to{" "}
            <a
              href="/admin/questionnaire"
              className="underline font-semibold hover:text-yellow-900"
            >
              Admin Questionnaire
            </a>{" "}
            to create sections and questions.
          </p>
        </div>
      </div>
    );
  }

  const totalQuestions = sections.reduce(
    (acc, s) => acc + (s.questions?.length ?? 0),
    0,
  );

  const handleNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  // Generate mock answers based on actual question IDs and types
  const generatedMockAnswers: Record<
    string,
    { value: unknown; richText?: string }
  > = {};
  sections.forEach((section) => {
    section.questions?.forEach((question) => {
      switch (question.type) {
        case "TEXT":
          generatedMockAnswers[question.id] = { value: "Sample text response" };
          break;
        case "TEXTAREA":
          generatedMockAnswers[question.id] = {
            value:
              "This is a longer form response that demonstrates how textarea answers would appear in the questionnaire. It can contain multiple sentences and paragraphs.",
          };
          break;
        case "RICH_TEXT":
          generatedMockAnswers[question.id] = {
            value: "<p>Rich text with <strong>formatting</strong></p>",
            richText: "<p>Rich text with <strong>formatting</strong></p>",
          };
          break;
        case "DROPDOWN":
          // Use first option if available
          if (Array.isArray(question.options) && question.options.length > 0) {
            generatedMockAnswers[question.id] = {
              value: question.options[1] ?? question.options[0],
            };
          }
          break;
        case "RADIO_7":
          // Use option 4 out of 7
          if (Array.isArray(question.options) && question.options.length > 3) {
            generatedMockAnswers[question.id] = { value: question.options[3] };
          }
          break;
        case "CHECKBOXES":
          // Select first and third options if available
          if (Array.isArray(question.options) && question.options.length > 0) {
            const selected = [question.options[0]];
            if (question.options.length > 2) {
              selected.push(question.options[2]);
            }
            generatedMockAnswers[question.id] = { value: selected };
          }
          break;
        case "NUMBER_SCALE":
          // Use value 7 for number scales
          generatedMockAnswers[question.id] = { value: 7 };
          break;
        default:
          generatedMockAnswers[question.id] = { value: "" };
      }
    });
  });

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Preview Mode:</strong> This shows the actual questionnaire
          configuration from the database with sample answers. Changes you make
          in the Admin Questionnaire editor will appear here and in the real
          application.
        </p>
        <p className="text-xs text-blue-600 mt-2">
          Showing {sections.length} section(s) with {totalQuestions} question(s)
        </p>
      </div>

      {pages.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-navy">
                Page {currentPageIndex + 1} of {pages.length}
              </div>
              <div className="text-xs text-navy-soft mt-1">
                {pages[currentPageIndex]?.title}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPageIndex === 0}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={currentPageIndex >= pages.length - 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
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

      <PreviewDraftProvider>
        <QuestionnaireForm
          previewMode={true}
          mockSections={sections}
          mockAnswers={generatedMockAnswers}
        />
      </PreviewDraftProvider>
    </div>
  );
}
