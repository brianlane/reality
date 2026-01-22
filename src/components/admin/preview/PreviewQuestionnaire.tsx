"use client";

import { useState, useEffect } from "react";
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

export default function PreviewQuestionnaire() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQuestionnaire = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/applications/questionnaire?applicationId=${MOCK_APPLICATION_ID}`,
        );
        const json = await res.json();

        if (!res.ok || json?.error) {
          setError("No questionnaire configured yet");
          setLoading(false);
          return;
        }

        setSections(json.sections ?? []);
        setLoading(false);
      } catch {
        setError("Failed to load questionnaire");
        setLoading(false);
      }
    };

    loadQuestionnaire();
  }, []);

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

  if (error || !sections || sections.length === 0) {
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
