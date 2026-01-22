"use client";

import { useCallback, useContext, useEffect, useState } from "react";
import { PreviewDraftContext } from "@/components/admin/preview/PreviewDraftProvider";

type DraftState = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  age?: number;
  gender?: string;
  location?: string;
  occupation?: string;
  employer?: string | null;
  education?: string;
  incomeRange?: string;
  height?: string;
  bodyType?: string;
  ethnicity?: string;
  religion?: string;
  politicalViews?: string;
  relationshipStatus?: string;
  hasChildren?: boolean;
  wantsChildren?: string;
  drinkingHabits?: string;
  smokingHabits?: string;
  exerciseFrequency?: string;
  applicationId?: string;
  demographics?: Record<string, unknown>;
  questionnaire?: Record<string, unknown>;
  photos?: string[];
};

const STORAGE_KEY = "reality-application-draft";

export function useApplicationDraft() {
  // Check if we're in a preview context
  const previewContext = useContext(PreviewDraftContext);

  // Always initialize localStorage-based state
  const [draft, setDraft] = useState<DraftState>(() => {
    if (typeof window === "undefined") {
      return { photos: [] };
    }

    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!stored) {
      return { photos: [] };
    }

    try {
      return JSON.parse(stored) as DraftState;
    } catch {
      globalThis.localStorage?.removeItem(STORAGE_KEY);
      return { photos: [] };
    }
  });

  useEffect(() => {
    // Skip localStorage sync if in preview mode
    if (previewContext) return;

    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!stored) {
      return;
    }

    try {
      const parsed = JSON.parse(stored) as DraftState;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate draft from localStorage
      setDraft(parsed);
    } catch {
      globalThis.localStorage?.removeItem(STORAGE_KEY);
    }
  }, [previewContext]);

  const updateDraft = useCallback((updates: Partial<DraftState>) => {
    setDraft((prev) => {
      const next = { ...prev, ...updates };
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // If we're in preview mode, return the preview draft instead
  if (previewContext) {
    return {
      draft: previewContext.draft as DraftState,
      updateDraft: previewContext.updateDraft,
    };
  }

  // Otherwise return localStorage-based draft
  return { draft, updateDraft };
}
