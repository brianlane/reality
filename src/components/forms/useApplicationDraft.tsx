import { useCallback, useEffect, useState } from "react";

type DraftState = {
  userId: string;
  applicationId?: string;
  demographics?: Record<string, unknown>;
  questionnaire?: Record<string, unknown>;
  photos?: string[];
};

const STORAGE_KEY = "reality-application-draft";

export function useApplicationDraft() {
  const [draft, setDraft] = useState<DraftState>({
    userId: "mock-user",
    photos: [],
  });

  useEffect(() => {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (stored) {
      setDraft(JSON.parse(stored));
    }
  }, []);

  const updateDraft = useCallback((updates: Partial<DraftState>) => {
    setDraft((prev) => {
      const next = { ...prev, ...updates };
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { draft, updateDraft };
}
