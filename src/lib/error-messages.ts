export const ERROR_MESSAGES = {
  AUTH_NOT_CONFIGURED: "Authentication is not configured.",
  SIGN_IN_TO_CONTINUE: "Please sign in to continue.",
  SIGN_IN_TO_CONTINUE_APPLICATION:
    "Please sign in to continue your application.",
  OWN_APPLICATION_ONLY: "You can only access your own application.",
  QUESTIONNAIRE_STATUS_UNAVAILABLE:
    "Questionnaire access is not available for this status.",
  INVALID_RESEARCH_INVITE: "Your research invite is not valid.",
  APP_NOT_FOUND_OR_INVITED: "Applicant not found or not invited.",
  FAILED_CREATE_SESSION: "Failed to create session. Please try again.",
  FAILED_SUBMIT_APPLICATION: "Failed to submit application. Please try again.",
  FAILED_SAVE_APPLICATION: "Failed to save application.",
  FAILED_LOAD_QUESTIONNAIRE: "Failed to load questionnaire.",
  FAILED_SAVE_QUESTIONNAIRE_ANSWERS: "Failed to save questionnaire answers.",
  ACCOUNT_EXISTS_PASSWORD_INCORRECT:
    "An account exists with this email but the password is incorrect. Please try again or reset your password.",
  PREVIEW_MODE_SUBMIT_DISABLED: "Preview mode - form submission is disabled",
} as const;
