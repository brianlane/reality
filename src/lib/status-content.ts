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
      "You have been invited to help validate our questionnaire. Click below to begin.",
    actionText: "Start Research Questionnaire",
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
  greeting: (firstName: string) => string;
  nextSteps?: {
    title: string;
    steps: string[];
  };
}

export const EMAIL_STATUS_CONTENT: Record<
  StatusContentKey,
  EmailStatusContent
> = {
  DRAFT: {
    ...STATUS_CONTENT.DRAFT,
    emailSubject: "Application in Progress - Reality Matchmaking",
    greeting: (firstName) => `Hi ${firstName},`,
  },
  SUBMITTED: {
    ...STATUS_CONTENT.SUBMITTED,
    emailSubject: "Application Submitted - Reality Matchmaking",
    greeting: (firstName) => `Hi ${firstName},`,
  },
  PAYMENT_PENDING: {
    ...STATUS_CONTENT.PAYMENT_PENDING,
    emailSubject: "Payment Pending - Reality Matchmaking",
    greeting: (firstName) => `Hi ${firstName},`,
    nextSteps: {
      title: "What happens after payment:",
      steps: [
        "Complete full application questionnaire (80 questions)",
        "Identity verification and background check",
        "Review by our team",
        "Approval and event invitation",
      ],
    },
  },
  SCREENING_IN_PROGRESS: {
    ...STATUS_CONTENT.SCREENING_IN_PROGRESS,
    emailSubject: "Application Under Review - Reality Matchmaking",
    greeting: (firstName) => `Hi ${firstName},`,
  },
  APPROVED: {
    ...STATUS_CONTENT.APPROVED,
    emailSubject: "Application Approved - Reality Matchmaking",
    greeting: (firstName) => `Hi ${firstName},`,
    nextSteps: {
      title: "What Happens Next?",
      steps: [
        "Event Invitation: You'll receive an invitation to our next matchmaking event with details about date, time, and venue",
        "Curated Matches: Our team will review your questionnaire and curate personalized matches for you",
        "Pre-Event Preparation: We'll send you tips and guidance to help you make the most of your matchmaking experience",
        "Ongoing Support: Our team is here to support you throughout your journey to finding your match",
      ],
    },
  },
  WAITLIST_INVITED: {
    ...STATUS_CONTENT.WAITLIST_INVITED,
    emailSubject: "You've Been Invited - Reality Matchmaking",
    greeting: (firstName) => `Hi ${firstName},`,
    nextSteps: {
      title: "Next Steps:",
      steps: [
        "Complete Your Profile: Fill in your full demographic information",
        "Application Fee: Submit the $199 application fee",
        "Full Assessment: Complete our comprehensive 80-question questionnaire",
      ],
    },
  },
  RESEARCH_INVITED: {
    ...STATUS_CONTENT.RESEARCH_INVITED,
    emailSubject: "Research Invitation - Reality Matchmaking",
    greeting: (firstName) => `Hi ${firstName},`,
  },
  RESEARCH_IN_PROGRESS: {
    ...STATUS_CONTENT.RESEARCH_IN_PROGRESS,
    emailSubject: "Research Questionnaire in Progress - Reality Matchmaking",
    greeting: (firstName) => `Hi ${firstName},`,
  },
  RESEARCH_COMPLETED: {
    ...STATUS_CONTENT.RESEARCH_COMPLETED,
    emailSubject: "Research Completed - Reality Matchmaking",
    greeting: (firstName) => `Hi ${firstName},`,
  },
  SOFT_REJECTED: {
    ...STATUS_CONTENT.SOFT_REJECTED,
    emailSubject: "Application Update - Reality Matchmaking",
    greeting: (firstName) => `Hi ${firstName},`,
  },
};
