export type ProlificParams = {
  prolificPid?: string;
  prolificStudyId?: string;
  prolificSessionId?: string;
};

// Completion code for all Prolific participants
// Set this code in Prolific's study settings under "Completion paths"
export const PROLIFIC_COMPLETION_CODE =
  process.env.NEXT_PUBLIC_PROLIFIC_COMPLETION_CODE || "C6NBKFHR";

/**
 * Build the Prolific completion redirect URL
 */
export function buildProlificRedirectUrl(completionCode: string): string {
  return `https://app.prolific.com/submissions/complete?cc=${completionCode}`;
}

/**
 * Validate that all required Prolific parameters are present
 */
export function hasValidProlificParams(params: ProlificParams): boolean {
  return Boolean(
    params.prolificPid && params.prolificStudyId && params.prolificSessionId,
  );
}

/**
 * Store Prolific params in localStorage for persistence across navigation
 */
export function storeProlificParams(params: ProlificParams): void {
  if (typeof window === "undefined") return;

  if (params.prolificPid) {
    localStorage.setItem("prolificPid", params.prolificPid);
  }
  if (params.prolificStudyId) {
    localStorage.setItem("prolificStudyId", params.prolificStudyId);
  }
  if (params.prolificSessionId) {
    localStorage.setItem("prolificSessionId", params.prolificSessionId);
  }
}

/**
 * Retrieve Prolific params from localStorage
 */
export function retrieveProlificParams(): ProlificParams {
  if (typeof window === "undefined") {
    return {};
  }

  return {
    prolificPid: localStorage.getItem("prolificPid") || undefined,
    prolificStudyId: localStorage.getItem("prolificStudyId") || undefined,
    prolificSessionId: localStorage.getItem("prolificSessionId") || undefined,
  };
}

/**
 * Clear Prolific params from localStorage
 */
export function clearProlificParams(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem("prolificPid");
  localStorage.removeItem("prolificStudyId");
  localStorage.removeItem("prolificSessionId");
  localStorage.removeItem("prolificCompletionCode");
}
