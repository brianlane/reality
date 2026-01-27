/**
 * Email Type Definitions
 *
 * Defines types for email sending and logging throughout the application.
 */

export type EmailType =
  | "WAITLIST_CONFIRMATION"
  | "WAITLIST_INVITE"
  | "PAYMENT_CONFIRMATION"
  | "APPLICATION_APPROVAL"
  | "EVENT_INVITATION"
  | "STATUS_UPDATE";

/**
 * Test Email Types
 *
 * Specific email types available for testing via the admin test endpoint.
 * This is the single source of truth - both frontend and backend import from here.
 */
export type TestEmailType =
  | "WAITLIST_CONFIRMATION"
  | "WAITLIST_INVITE"
  | "PAYMENT_CONFIRMATION"
  | "APPLICATION_APPROVAL"
  | "EVENT_INVITATION"
  | "STATUS_UPDATE_SCREENING"
  | "STATUS_UPDATE_REJECTED"
  | "STATUS_UPDATE_PAYMENT_PENDING";

/**
 * Array of all test email types for UI dropdowns
 */
export const TEST_EMAIL_TYPES: readonly TestEmailType[] = [
  "WAITLIST_CONFIRMATION",
  "WAITLIST_INVITE",
  "PAYMENT_CONFIRMATION",
  "APPLICATION_APPROVAL",
  "EVENT_INVITATION",
  "STATUS_UPDATE_SCREENING",
  "STATUS_UPDATE_REJECTED",
  "STATUS_UPDATE_PAYMENT_PENDING",
] as const;

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  emailType: EmailType;
  applicantId?: string;
}

export interface EmailSendResult {
  success: boolean;
  data?: unknown;
  error?: string;
}
