import Link from "next/link";
import type { Applicant } from "@prisma/client";

type Props = {
  application: Applicant;
};

export default function ExistingApplicationStatus({ application }: Props) {
  const { applicationStatus, waitlistInviteToken } = application;

  // Define status-specific content
  const statusContent = {
    DRAFT: {
      icon: "📝",
      title: "Application in Progress",
      description:
        "You have an application in progress. Continue where you left off to complete your submission.",
      actionText: "View Dashboard",
      actionHref: "/dashboard",
    },
    SUBMITTED: {
      icon: "✓",
      title: "Application Submitted",
      description:
        "Your application has been submitted and is currently under review. We'll notify you once we've reviewed your submission.",
      actionText: "View Dashboard",
      actionHref: "/dashboard",
    },
    PAYMENT_PENDING: {
      icon: "💳",
      title: "Payment Pending",
      description:
        "Your application is ready, but payment is required to complete the process. Please complete your payment to proceed.",
      actionText: "Complete Payment",
      actionHref: "/apply/payment",
    },
    SCREENING_IN_PROGRESS: {
      icon: "🔍",
      title: "Application Under Review",
      description:
        "We're currently reviewing your application. This process typically takes 3-5 business days. We'll send you an email once the review is complete.",
      actionText: "View Dashboard",
      actionHref: "/dashboard",
    },
    APPROVED: {
      icon: "🎉",
      title: "Application Approved!",
      description:
        "Congratulations! Your application has been approved. You can now access your matches and view upcoming events.",
      actionText: "Go to Dashboard",
      actionHref: "/dashboard",
    },
    REJECTED: {
      icon: "✕",
      title: "Application Decision",
      description:
        "Thank you for your interest in Reality Matchmaking. After careful review, we're unable to move forward with your application at this time. This decision is based on our current matching criteria and availability.",
      actionText: "Back to Home",
      actionHref: "/",
    },
    WAITLIST_INVITED: {
      icon: "🎊",
      title: "You've Been Invited!",
      description:
        "Great news! You've been invited off the waitlist to complete your full application. Click below to continue with the next steps.",
      actionText: "Complete Application",
      actionHref: waitlistInviteToken
        ? `/apply/continue?token=${waitlistInviteToken}`
        : "/dashboard",
    },
  };

  const content =
    statusContent[applicationStatus as keyof typeof statusContent];

  if (!content) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <p className="text-navy">
          You already have an application with us. Please check your email for
          next steps.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col items-center text-center space-y-6">
        {/* Icon */}
        <div className="text-6xl">{content.icon}</div>

        {/* Title */}
        <h1 className="text-3xl font-semibold text-navy">{content.title}</h1>

        {/* Description */}
        <p className="text-lg text-navy-soft max-w-2xl">
          {content.description}
        </p>

        {/* Action Button */}
        <div className="pt-4">
          <Link
            href={content.actionHref}
            className="inline-block rounded-md bg-navy px-8 py-4 text-base font-medium text-white hover:bg-copper transition-colors"
          >
            {content.actionText}
          </Link>
        </div>

        {/* Application ID reference */}
        <p className="text-xs text-slate-400 pt-4">
          Application ID: {application.id}
        </p>
      </div>
    </div>
  );
}
