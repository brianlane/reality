export const APP_STATUS = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  SCREENING_IN_PROGRESS: "SCREENING_IN_PROGRESS",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  WAITLIST: "WAITLIST",
  WAITLIST_INVITED: "WAITLIST_INVITED",
  RESEARCH_INVITED: "RESEARCH_INVITED",
  RESEARCH_IN_PROGRESS: "RESEARCH_IN_PROGRESS",
  RESEARCH_COMPLETED: "RESEARCH_COMPLETED",
} as const;

export type AppStatus = (typeof APP_STATUS)[keyof typeof APP_STATUS];

export const RESEARCH_STATUSES: readonly AppStatus[] = [
  APP_STATUS.RESEARCH_INVITED,
  APP_STATUS.RESEARCH_IN_PROGRESS,
  APP_STATUS.RESEARCH_COMPLETED,
] as const;

export const DEMOGRAPHICS_TO_DASHBOARD_STATUSES: readonly AppStatus[] = [
  APP_STATUS.SUBMITTED,
  APP_STATUS.SCREENING_IN_PROGRESS,
  APP_STATUS.APPROVED,
  APP_STATUS.REJECTED,
  APP_STATUS.WAITLIST,
  APP_STATUS.WAITLIST_INVITED,
  APP_STATUS.RESEARCH_INVITED,
  APP_STATUS.RESEARCH_IN_PROGRESS,
  APP_STATUS.RESEARCH_COMPLETED,
] as const;

export const QUESTIONNAIRE_NON_RESEARCH_ALLOWED_STATUSES: readonly AppStatus[] =
  [
    APP_STATUS.WAITLIST_INVITED,
    APP_STATUS.PAYMENT_PENDING,
    APP_STATUS.DRAFT,
  ] as const;

/**
 * Check if a status is a research-related status.
 *
 * @param status - The application status to check
 * @returns True if the status is research-related
 */
export function isResearchStatus(status: string): boolean {
  return RESEARCH_STATUSES.includes(status as AppStatus);
}

/**
 * Check if a status should redirect to the dashboard from demographics page.
 *
 * @param status - The application status to check
 * @returns True if the status requires dashboard redirect
 */
export function isDashboardRedirectStatus(status: string): boolean {
  return DEMOGRAPHICS_TO_DASHBOARD_STATUSES.includes(status as AppStatus);
}

/**
 * Check if a status allows non-research users to access the questionnaire.
 *
 * @param status - The application status to check
 * @returns True if the status allows questionnaire access
 */
export function isQuestionnaireAccessibleStatus(status: string): boolean {
  return QUESTIONNAIRE_NON_RESEARCH_ALLOWED_STATUSES.includes(
    status as AppStatus,
  );
}
