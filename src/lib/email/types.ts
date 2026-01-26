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
