"use client";

import ApplicationDraftForm from "@/components/forms/ApplicationDraftForm";
import { PreviewDraftProvider } from "./PreviewDraftProvider";

export default function PreviewDemographics() {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Preview Mode:</strong> This is Stage 4 - Demographics. After
          being invited off the waitlist, applicants provide detailed
          demographic and background information.
        </p>
      </div>

      <PreviewDraftProvider>
        <ApplicationDraftForm previewMode={true} />
      </PreviewDraftProvider>
    </div>
  );
}
