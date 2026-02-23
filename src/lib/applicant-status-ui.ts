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
    case "DRAFT":
      return {
        title: "Complete Your Application",
        description:
          "Your access fee has been processed. Please complete the compatibility questionnaire and upload your photos to finish submitting your application.",
        ctaLabel: "Continue Questionnaire",
        ctaHref: "/apply/questionnaire",
        badge: "In Progress",
        badgeClass: "bg-amber-100 text-amber-800",
      };
    case "PAYMENT_PENDING":
      return {
        title: "Payment Required",
        description:
          "Please complete your application fee payment to unlock the questionnaire.",
        ctaLabel: "Complete Payment",
        ctaHref: "/apply/payment",
        badge: "Payment Pending",
        badgeClass: "bg-amber-100 text-amber-800",
      };
    case "SUBMITTED":
      return {
        title: "Application Submitted",
        description:
          "Your application is under review. Our team will be in touch soon.",
        badge: "Submitted",
        badgeClass: "bg-blue-100 text-blue-800",
      };
    case "SCREENING_IN_PROGRESS":
      return {
        title: "Under Review",
        description:
          "Your application is currently being reviewed by our team.",
        badge: "Under Review",
        badgeClass: "bg-blue-100 text-blue-800",
      };
    case "APPROVED":
      return {
        title: "Application Approved",
        description:
          "Congratulations! Your application has been approved. Welcome to Reality Matchmaking.",
        badge: "Approved",
        badgeClass: "bg-green-100 text-green-800",
      };
    case "REJECTED":
      return {
        title: "Application Not Approved",
        description:
          "Unfortunately, your application was not approved at this time. Please contact us if you have questions.",
        badge: "Not Approved",
        badgeClass: "bg-red-100 text-red-800",
      };
    case "WAITLIST":
      return {
        title: "On the Waitlist",
        description:
          "You're on our waitlist. We'll reach out when a spot opens up.",
        badge: "Waitlisted",
        badgeClass: "bg-slate-100 text-slate-700",
      };
    case "WAITLIST_INVITED":
      return {
        title: "Invited Off Waitlist",
        description:
          "You've been invited to continue your application. Check your email for next steps.",
        badge: "Invited",
        badgeClass: "bg-green-100 text-green-800",
      };
    case "RESEARCH_INVITED":
      return {
        title: "Research Invitation Ready",
        description:
          "You have been invited to help validate our questionnaire. Use the link from your email to start or resume the research questionnaire.",
        badge: "Research Invited",
        badgeClass: "bg-purple-100 text-purple-800",
      };
    case "RESEARCH_IN_PROGRESS":
      return {
        title: "Research Questionnaire in Progress",
        description:
          "Thanks for helping with our research. Use the link from your email to continue where you left off.",
        badge: "Research In Progress",
        badgeClass: "bg-purple-100 text-purple-800",
      };
    case "RESEARCH_COMPLETED":
      return {
        title: "Research Completed",
        description:
          "Thank you for completing the research questionnaire. Your responses have been recorded.",
        badge: "Research Completed",
        badgeClass: "bg-green-100 text-green-800",
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
