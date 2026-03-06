const DRAFT_STORAGE_KEY = "reality-application-draft";

type DraftStorage = {
  applicationId?: string;
  questionnaire?: unknown;
  currentPageId?: string;
  completedPageIds?: string[];
  photos?: string[];
} & Record<string, unknown>;

export function resetResearchDraftContext(applicationId: string) {
  if (typeof window === "undefined") return;

  const fallbackDraft: DraftStorage = {
    applicationId,
    photos: [],
  };

  const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(fallbackDraft));
    return;
  }

  try {
    const parsed = JSON.parse(raw) as DraftStorage;
    const rest = { ...parsed };
    delete rest.currentPageId;
    delete rest.completedPageIds;
    delete rest.questionnaire;
    const nextDraft: DraftStorage = {
      ...rest,
      applicationId,
      photos: Array.isArray(rest.photos) ? (rest.photos as string[]) : [],
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextDraft));
  } catch {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(fallbackDraft));
  }
}
