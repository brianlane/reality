import { APP_STATUS } from "@/lib/application-status";
import { STATUS_CONTENT } from "@/lib/status-content";

export type StatusActionConfig = {
  /** Shown as the card/page title */
  title: string;
  /** Descriptive text shown below the title */
  description: string;
  /** Label for the call-to-action button, if any */
  ctaLabel?: string;
  /** Destination for the call-to-action, if any */
  ctaHref?: string;
  /** Short badge text */
  badge: string;
  /** Tailwind classes for the badge */
  badgeClass: string;
};

export function getApplicationStatusConfig(status: string): StatusActionConfig {
  switch (status) {
    // Action-oriented overrides: copy is intentionally different from email/admin content
    case APP_STATUS.DRAFT:
      return {
        title: "Complete Your Application",
        description:
          "Your access fee has been processed. Please complete the compatibility questionnaire and upload your photos to finish submitting your application.",
        ctaLabel: "Continue Questionnaire",
        ctaHref: "/apply/questionnaire",
        badge: "In Progress",
        badgeClass: "bg-amber-100 text-amber-800",
      };
    case APP_STATUS.PAYMENT_PENDING:
      return {
        title: "Payment Required",
        description:
          "Please complete your application fee payment to unlock the questionnaire.",
        ctaLabel: "Complete Payment",
        ctaHref: "/apply/payment",
        badge: "Payment Pending",
        badgeClass: "bg-amber-100 text-amber-800",
      };
    case APP_STATUS.REJECTED:
      // Portal uses direct language; email uses soft "Application Update" copy
      return {
        title: "Application Not Approved",
        description:
          "Unfortunately, your application was not approved at this time. Please contact us if you have questions.",
        badge: "Not Approved",
        badgeClass: "bg-red-100 text-red-800",
      };
    case APP_STATUS.WAITLIST_INVITED:
      // Portal directs to email; STATUS_CONTENT says "Click below" (email CTA language)
      return {
        title: STATUS_CONTENT.WAITLIST_INVITED.title,
        description:
          "You've been invited to continue your application. Check your email for next steps.",
        badge: "Invited",
        badgeClass: "bg-green-100 text-green-800",
      };
    case APP_STATUS.RESEARCH_INVITED:
      // Portal directs to email link; STATUS_CONTENT says "link below" (email CTA language)
      return {
        title: STATUS_CONTENT.RESEARCH_INVITED.title,
        description:
          "You have been invited to help validate our questionnaire. Use the link from your email to start or resume the research questionnaire.",
        badge: "Research Invited",
        badgeClass: "bg-purple-100 text-purple-800",
      };
    case APP_STATUS.RESEARCH_IN_PROGRESS:
      // Portal directs to email link; STATUS_CONTENT omits the email reference
      return {
        title: STATUS_CONTENT.RESEARCH_IN_PROGRESS.title,
        description:
          "Thanks for helping with our research. Use the link from your email to continue where you left off.",
        badge: "Research In Progress",
        badgeClass: "bg-purple-100 text-purple-800",
      };

    // Shared with STATUS_CONTENT: titles and descriptions pulled from single source of truth
    case APP_STATUS.SUBMITTED:
      return {
        title: STATUS_CONTENT.SUBMITTED.title,
        description: STATUS_CONTENT.SUBMITTED.description,
        badge: "Submitted",
        badgeClass: "bg-blue-100 text-blue-800",
      };
    case APP_STATUS.SCREENING_IN_PROGRESS:
      return {
        title: STATUS_CONTENT.SCREENING_IN_PROGRESS.title,
        description: STATUS_CONTENT.SCREENING_IN_PROGRESS.description,
        badge: "Under Review",
        badgeClass: "bg-blue-100 text-blue-800",
      };
    case APP_STATUS.APPROVED:
      return {
        title: STATUS_CONTENT.APPROVED.title,
        description: STATUS_CONTENT.APPROVED.description,
        badge: "Approved",
        badgeClass: "bg-green-100 text-green-800",
      };
    case APP_STATUS.WAITLIST:
      return {
        title: STATUS_CONTENT.WAITLIST.title,
        description: STATUS_CONTENT.WAITLIST.description,
        badge: "Waitlisted",
        badgeClass: "bg-slate-100 text-slate-700",
      };
    case APP_STATUS.RESEARCH_COMPLETED:
      return {
        title: STATUS_CONTENT.RESEARCH_COMPLETED.title,
        description: STATUS_CONTENT.RESEARCH_COMPLETED.description,
        badge: "Research Completed",
        badgeClass: "bg-green-100 text-green-800",
      };
    case "SOFT_REJECTED": // not in APP_STATUS constants
      return {
        title: STATUS_CONTENT.SOFT_REJECTED.title,
        description: STATUS_CONTENT.SOFT_REJECTED.description,
        badge: "Under Review",
        badgeClass: "bg-blue-100 text-blue-800",
      };
    default:
      return {
        title: "Application",
        description: "Track your application status and next steps.",
        badge: status,
        badgeClass: "bg-slate-100 text-slate-700",
      };
  }
}
