import Link from "next/link";
import type { Applicant } from "@prisma/client";
import type { ReactNode } from "react";

type Props = {
  application: Applicant;
};

function CopperIcon({ d }: { d: string }) {
  return (
    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-copper/10">
      <svg
        className="h-10 w-10 text-copper"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
      </svg>
    </div>
  );
}

export default function ExistingApplicationStatus({ application }: Props) {
  const { applicationStatus, waitlistInviteToken, researchInviteCode } =
    application;
  const displayStatus = application.softRejectedAt
    ? (application.softRejectedFromStatus ?? applicationStatus)
    : applicationStatus;

  if (application.softRejectedAt) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center space-y-6">
          <CopperIcon d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          <h1 className="text-3xl font-semibold text-navy">
            Application Under Review
          </h1>
          <p className="text-lg text-navy-soft max-w-2xl">
            We&apos;re currently reviewing your application. We&apos;ll notify
            you once we&apos;ve completed the review.
          </p>
          <p className="text-xs text-slate-400 pt-4">
            Application ID: {application.id}
          </p>
        </div>
      </div>
    );
  }

  // Define status-specific content
  const statusContent: Record<
    string,
    {
      icon: ReactNode;
      title: string;
      description: string;
      actionText: string;
      actionHref: string;
    }
  > = {
    DRAFT: {
      icon: (
        <CopperIcon d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
      ),
      title: "Application in Progress",
      description:
        "You have an application in progress. Continue where you left off to complete your submission.",
      actionText: "View Dashboard",
      actionHref: "/dashboard",
    },
    SUBMITTED: {
      icon: <CopperIcon d="m4.5 12.75 6 6 9-13.5" />,
      title: "Application Submitted",
      description:
        "Your application has been submitted and is currently under review. We'll notify you once we've reviewed your submission.",
      actionText: "View Dashboard",
      actionHref: "/dashboard",
    },
    PAYMENT_PENDING: {
      icon: (
        <CopperIcon d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
      ),
      title: "Payment Pending",
      description:
        "Your application is ready, but payment is required to complete the process. Please complete your payment to proceed.",
      actionText: "Complete Payment",
      actionHref: "/apply/payment",
    },
    SCREENING_IN_PROGRESS: {
      icon: (
        <CopperIcon d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      ),
      title: "Application Under Review",
      description:
        "We're currently reviewing your application. This process typically takes 3-5 business days. We'll send you an email once the review is complete.",
      actionText: "View Dashboard",
      actionHref: "/dashboard",
    },
    APPROVED: {
      icon: (
        <CopperIcon d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
      ),
      title: "Application Approved!",
      description:
        "Congratulations! Your application has been approved. You can now access your matches and view upcoming events.",
      actionText: "Go to Dashboard",
      actionHref: "/dashboard",
    },
    WAITLIST_INVITED: {
      icon: (
        <CopperIcon d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
      ),
      title: "You've Been Invited!",
      description:
        "Great news! You've been invited off the waitlist to complete your full application. Click below to continue with the next steps.",
      actionText: "Complete Application",
      actionHref: waitlistInviteToken
        ? `/apply/continue?token=${waitlistInviteToken}`
        : "/dashboard",
    },
    RESEARCH_INVITED: {
      icon: (
        <CopperIcon d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 0 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      ),
      title: "Research Invitation Ready",
      description:
        "You have been invited to help validate our questionnaire. Click below to begin.",
      actionText: "Start Research Questionnaire",
      actionHref: researchInviteCode
        ? `/research?code=${researchInviteCode}`
        : "/research",
    },
    RESEARCH_IN_PROGRESS: {
      icon: (
        <CopperIcon d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 0 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      ),
      title: "Research Questionnaire in Progress",
      description:
        "Thanks for helping with our research. Continue where you left off.",
      actionText: "Continue Research Questionnaire",
      actionHref: researchInviteCode
        ? `/research?code=${researchInviteCode}`
        : "/research",
    },
    RESEARCH_COMPLETED: {
      icon: (
        <CopperIcon d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      ),
      title: "Research Completed",
      description:
        "Thank you for completing the research questionnaire. Your responses have been recorded.",
      actionText: "Return Home",
      actionHref: "/",
    },
  };

  const content = statusContent[displayStatus as keyof typeof statusContent];

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
        {content.icon}

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
