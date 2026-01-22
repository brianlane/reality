"use client";

import { createContext, useContext, ReactNode } from "react";
import { mockDemographics, MOCK_APPLICATION_ID } from "./mockData";

type PreviewDraftContextType = {
  draft: typeof mockDemographics & { applicationId: string };
  updateDraft: () => void;
  clearDraft: () => void;
};

const PreviewDraftContext = createContext<PreviewDraftContextType | null>(
  null
);

export function PreviewDraftProvider({ children }: { children: ReactNode }) {
  const draft = {
    ...mockDemographics,
    applicationId: MOCK_APPLICATION_ID,
  };

  return (
    <PreviewDraftContext.Provider
      value={{
        draft,
        updateDraft: () => {
          // No-op in preview mode
        },
        clearDraft: () => {
          // No-op in preview mode
        },
      }}
    >
      {children}
    </PreviewDraftContext.Provider>
  );
}

export function usePreviewDraft() {
  const context = useContext(PreviewDraftContext);
  if (!context) {
    throw new Error(
      "usePreviewDraft must be used within PreviewDraftProvider"
    );
  }
  return context;
}
