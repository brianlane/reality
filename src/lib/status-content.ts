/**
 * Single Source of Truth for Application Status Content
 *
 * Used by:
 * - Status pages (test views, application status displays)
 * - Email templates
 * - Admin interfaces
 */

export type StatusContentKey =
  | "DRAFT"
  | "SUBMITTED"
  | "PAYMENT_PENDING"
  | "SCREENING_IN_PROGRESS"
  | "APPROVED"
  | "WAITLIST_INVITED"
  | "RESEARCH_INVITED"
  | "RESEARCH_IN_PROGRESS"
  | "RESEARCH_COMPLETED"
  | "SOFT_REJECTED";

export interface StatusContent {
  title: string;
  description: string;
  actionText: string;
}

export const STATUS_CONTENT: Record<StatusContentKey, StatusContent> = {
  DRAFT: {
    title: "Application in Progress",
    description:
      "You have an application in progress. Continue where you left off to complete your submission.",
    actionText: "View Dashboard",
  },
  SUBMITTED: {
    title: "Application Submitted",
    description:
      "Your application has been submitted and is currently under review. We'll notify you once we've reviewed your submission.",
    actionText: "View Dashboard",
  },
  PAYMENT_PENDING: {
    title: "Payment Pending",
    description:
      "Your application is ready, but payment is required to complete the process. Please complete your payment to proceed.",
    actionText: "Complete Payment",
  },
  SCREENING_IN_PROGRESS: {
    title: "Application Under Review",
    description:
      "We're currently reviewing your application. This process typically takes 3-5 business days. We'll send you an email once the review is complete.",
    actionText: "View Dashboard",
  },
  APPROVED: {
    title: "Application Approved!",
    description:
      "Congratulations! Your application has been approved. You can now access your matches and view upcoming events.",
    actionText: "Go to Dashboard",
  },
  WAITLIST_INVITED: {
    title: "You've Been Invited!",
    description:
      "Great news! You've been invited off the waitlist to complete your full application. Click below to continue with the next steps.",
    actionText: "Complete Application",
  },
  RESEARCH_INVITED: {
    title: "Research Invitation Ready",
    description:
      "You have been invited to help validate our questionnaire. Use the link below to start now, and you can resume anytime later using this same link from your email.",
    actionText: "Start or Resume Research Questionnaire",
  },
  RESEARCH_IN_PROGRESS: {
    title: "Research Questionnaire in Progress",
    description:
      "Thanks for helping with our research. Continue where you left off.",
    actionText: "Continue Research Questionnaire",
  },
  RESEARCH_COMPLETED: {
    title: "Research Completed",
    description:
      "Thank you for completing the research questionnaire. Your responses have been recorded.",
    actionText: "Return Home",
  },
  SOFT_REJECTED: {
    title: "Application Under Review",
    description:
      "We're currently reviewing your application. We'll notify you once we've completed the review.",
    actionText: "View Dashboard",
  },
};

/**
 * Email-specific content that extends the base status content
 * with additional details for emails
 */
export interface EmailStatusContent extends StatusContent {
  emailSubject: string;
}

export const EMAIL_STATUS_CONTENT: Record<
  StatusContentKey,
  EmailStatusContent
> = {
  DRAFT: {
    ...STATUS_CONTENT.DRAFT,
    emailSubject: "Application in Progress - Reality Matchmaking",
  },
  SUBMITTED: {
    ...STATUS_CONTENT.SUBMITTED,
    emailSubject: "Application Submitted - Reality Matchmaking",
  },
  PAYMENT_PENDING: {
    ...STATUS_CONTENT.PAYMENT_PENDING,
    emailSubject: "Payment Pending - Reality Matchmaking",
  },
  SCREENING_IN_PROGRESS: {
    ...STATUS_CONTENT.SCREENING_IN_PROGRESS,
    emailSubject: "Application Under Review - Reality Matchmaking",
  },
  APPROVED: {
    ...STATUS_CONTENT.APPROVED,
    emailSubject: "Application Approved - Reality Matchmaking",
  },
  WAITLIST_INVITED: {
    ...STATUS_CONTENT.WAITLIST_INVITED,
    emailSubject: "You've Been Invited - Reality Matchmaking",
  },
  RESEARCH_INVITED: {
    ...STATUS_CONTENT.RESEARCH_INVITED,
    emailSubject: "Research Invitation - Reality Matchmaking",
  },
  RESEARCH_IN_PROGRESS: {
    ...STATUS_CONTENT.RESEARCH_IN_PROGRESS,
    emailSubject: "Research Questionnaire in Progress - Reality Matchmaking",
  },
  RESEARCH_COMPLETED: {
    ...STATUS_CONTENT.RESEARCH_COMPLETED,
    emailSubject: "Research Completed - Reality Matchmaking",
  },
  SOFT_REJECTED: {
    ...STATUS_CONTENT.SOFT_REJECTED,
    emailSubject: "Application Update - Reality Matchmaking",
  },
};
