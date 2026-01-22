"use client";

import { useState, useEffect } from "react";
import QuestionnaireForm from "@/components/forms/QuestionnaireForm";
import { mockQuestionnaireAnswers, MOCK_APPLICATION_ID } from "./mockData";
import { PreviewDraftProvider } from "./PreviewDraftProvider";

export default function PreviewQuestionnaire() {
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadQuestionnaire = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/applications/questionnaire?applicationId=${MOCK_APPLICATION_ID}`
        );
        const json = await res.json();

        if (!res.ok || json?.error) {
          setError("No questionnaire configured yet");
          setLoading(false);
          return;
        }

        setSections(json.sections ?? []);
        setLoading(false);
      } catch (err) {
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
    0
  );

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
          mockAnswers={mockQuestionnaireAnswers}
        />
      </PreviewDraftProvider>
    </div>
  );
}
