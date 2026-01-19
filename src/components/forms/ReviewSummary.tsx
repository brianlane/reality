"use client";

import { useApplicationDraft } from "./useApplicationDraft";

export default function ReviewSummary() {
  const { draft } = useApplicationDraft();

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-navy">Review Summary</h2>
      <pre className="whitespace-pre-wrap text-xs text-navy-soft">
        {JSON.stringify(
          {
            demographics: draft.demographics,
            questionnaire: draft.questionnaire,
            photos: draft.photos,
          },
          null,
          2,
        )}
      </pre>
    </div>
  );
}
