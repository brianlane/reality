import { useCallback, useState } from "react";

type DraftState = {
  userId: string;
  applicationId?: string;
  demographics?: Record<string, unknown>;
  questionnaire?: Record<string, unknown>;
  photos?: string[];
};

const STORAGE_KEY = "reality-application-draft";

export function useApplicationDraft() {
  const [draft, setDraft] = useState<DraftState>(() => {
    if (typeof window === "undefined") {
      return { userId: "mock-user", photos: [] };
    }

    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!stored) {
      return { userId: "mock-user", photos: [] };
    }

    try {
      return JSON.parse(stored) as DraftState;
    } catch {
      globalThis.localStorage?.removeItem(STORAGE_KEY);
      return { userId: "mock-user", photos: [] };
    }
  });

  const updateDraft = useCallback((updates: Partial<DraftState>) => {
    setDraft((prev) => {
      const next = { ...prev, ...updates };
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { draft, updateDraft };
}
