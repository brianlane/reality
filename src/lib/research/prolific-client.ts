export type ProlificParams = {
  prolificPid?: string;
  prolificStudyId?: string;
  prolificSessionId?: string;
};

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
 * Clear Prolific params from localStorage
 */
export function clearProlificParams(): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem("prolificPid");
  localStorage.removeItem("prolificStudyId");
  localStorage.removeItem("prolificSessionId");
  localStorage.removeItem("prolificCompletionCode");
}
