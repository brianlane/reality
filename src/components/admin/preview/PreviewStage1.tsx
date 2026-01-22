"use client";

import Stage1QualificationForm from "@/components/forms/Stage1QualificationForm";

export default function PreviewStage1() {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Preview Mode:</strong> This is Stage 1 - Initial
          Qualification. Applicants fill out basic information to join the
          waitlist.
        </p>
      </div>

      <Stage1QualificationForm previewMode={true} />
    </div>
  );
}
