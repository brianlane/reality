"use client";

import { useState } from "react";
import Link from "next/link";
import LogoCircles from "@/components/layout/LogoCircles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// View registry
// ---------------------------------------------------------------------------

type ViewCategory =
  | "public"
  | "auth"
  | "research"
  | "application-status"
  | "applicant";

type ViewItem = {
  id: string;
  label: string;
  category: ViewCategory;
  route: string;
  description: string;
};

const VIEW_CATEGORIES: { id: ViewCategory; label: string }[] = [
  { id: "public", label: "Public" },
  { id: "auth", label: "Authentication" },
  { id: "research", label: "Research" },
  { id: "application-status", label: "Application Status" },
  { id: "applicant", label: "Applicant Dashboard" },
];

const VIEWS: ViewItem[] = [
  // Public
  {
    id: "homepage",
    label: "Homepage",
    category: "public",
    route: "/",
    description: "Landing page with logo and Join Now / Sign in buttons",
  },
  // Auth
  {
    id: "sign-in",
    label: "Sign In",
    category: "auth",
    route: "/sign-in",
    description: "Sign-in form for existing users",
  },
  {
    id: "forgot-password",
    label: "Forgot Password",
    category: "auth",
    route: "/forgot-password",
    description: "Request a password reset email",
  },
  {
    id: "reset-password",
    label: "Reset Password",
    category: "auth",
    route: "/reset-password",
    description: "Set a new password after clicking a reset link",
  },
  {
    id: "create-password",
    label: "Create Password",
    category: "auth",
    route: "/apply/create-password?id=...",
    description:
      "Final step of application: create account password and submit",
  },
  // Research
  {
    id: "research-invalid-link",
    label: "Research - Invalid Link",
    category: "research",
    route: "/research",
    description: "Shown when research invite link has no code parameter",
  },
  {
    id: "research-invite-error",
    label: "Research - Invalid Invitation",
    category: "research",
    route: "/research?code=invalid",
    description: "Shown when research invite code is expired or invalid",
  },
  {
    id: "research-thank-you",
    label: "Research - Thank You",
    category: "research",
    route: "/research/thank-you",
    description: "Confirmation page after completing research questionnaire",
  },
  // Application Status
  {
    id: "status-soft-rejected",
    label: "Soft Rejected",
    category: "application-status",
    route: "/apply",
    description:
      "Shown when applicant has been soft-rejected (still sees 'Under Review')",
  },
  {
    id: "status-draft",
    label: "Draft",
    category: "application-status",
    route: "/apply",
    description: "Application in progress",
  },
  {
    id: "status-submitted",
    label: "Submitted",
    category: "application-status",
    route: "/apply",
    description: "Application submitted and under review",
  },
  {
    id: "status-payment-pending",
    label: "Payment Pending",
    category: "application-status",
    route: "/apply",
    description: "Application ready but payment required",
  },
  {
    id: "status-screening",
    label: "Screening In Progress",
    category: "application-status",
    route: "/apply",
    description: "Application under manual review",
  },
  {
    id: "status-approved",
    label: "Approved",
    category: "application-status",
    route: "/apply",
    description: "Application approved",
  },
  {
    id: "status-waitlist-invited",
    label: "Waitlist Invited",
    category: "application-status",
    route: "/apply",
    description: "Invited off the waitlist to complete full application",
  },
  {
    id: "status-research-invited",
    label: "Research Invited",
    category: "application-status",
    route: "/apply",
    description: "Invited to help validate the questionnaire",
  },
  {
    id: "status-research-in-progress",
    label: "Research In Progress",
    category: "application-status",
    route: "/apply",
    description: "Research questionnaire started but not completed",
  },
  {
    id: "status-research-completed",
    label: "Research Completed",
    category: "application-status",
    route: "/apply",
    description: "Research questionnaire finished",
  },
  // Applicant Dashboard
  {
    id: "dashboard",
    label: "Dashboard",
    category: "applicant",
    route: "/dashboard",
    description: "Main applicant dashboard with summary, events, and matches",
  },
  {
    id: "application-page",
    label: "Application",
    category: "applicant",
    route: "/application",
    description: "Application status tracking page",
  },
  {
    id: "events-list",
    label: "Events",
    category: "applicant",
    route: "/events",
    description: "Upcoming events listing page",
  },
  {
    id: "event-detail",
    label: "Event Detail",
    category: "applicant",
    route: "/events/[id]",
    description: "Individual event detail page",
  },
  {
    id: "matches-list",
    label: "Matches",
    category: "applicant",
    route: "/matches",
    description: "Matches listing page",
  },
  {
    id: "match-detail",
    label: "Match Detail",
    category: "applicant",
    route: "/matches/[id]",
    description: "Individual match detail / conversation page",
  },
  {
    id: "settings",
    label: "Settings",
    category: "applicant",
    route: "/settings",
    description: "Account settings and notification preferences",
  },
];

// ---------------------------------------------------------------------------
// Mock data helpers
// ---------------------------------------------------------------------------

function mockApplicant(overrides: Record<string, unknown> = {}) {
  return {
    id: "preview-app-001",
    applicationStatus: "DRAFT",
    waitlistInviteToken: "preview-token-abc123",
    researchInviteCode: "preview-research-xyz",
    softRejectedAt: null,
    softRejectedFromStatus: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Preview renderers
// ---------------------------------------------------------------------------

function PreviewHomepage() {
  return (
    <section className="mx-auto flex min-h-[600px] w-full items-center justify-center bg-white px-6">
      <div className="flex flex-col items-center gap-12">
        <div className="flex flex-col items-center gap-8">
          <LogoCircles />
          <div className="flex flex-col items-center leading-none">
            <span className="text-6xl font-bold tracking-tight text-copper">
              REALITY
            </span>
            <span className="mt-2 text-sm font-medium uppercase tracking-wider text-navy-soft">
              Matchmaking
            </span>
          </div>
        </div>
        <div className="flex w-full max-w-md flex-col items-center gap-3">
          <button className="w-full rounded-md bg-navy px-8 py-4 text-center text-base font-medium text-white">
            Join Now
          </button>
          <button className="w-full rounded-md border border-slate-300 px-8 py-4 text-center text-base font-medium text-navy">
            Sign in
          </button>
        </div>
      </div>
    </section>
  );
}

function PreviewSignIn() {
  return (
    <section className="mx-auto w-full max-w-md bg-white px-6 py-16">
      <h1 className="text-3xl font-semibold text-navy">Sign in</h1>
      <form className="mt-8 space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label
            className="text-sm font-medium text-navy"
            htmlFor="preview-email"
          >
            Email
          </label>
          <Input
            id="preview-email"
            type="email"
            autoComplete="off"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label
            className="text-sm font-medium text-navy"
            htmlFor="preview-password"
          >
            Password
          </label>
          <Input id="preview-password" type="password" autoComplete="off" />
          <div className="mt-1 text-right">
            <span className="cursor-pointer text-sm text-copper hover:underline">
              Forgot password?
            </span>
          </div>
        </div>
        <Button className="w-full" type="button">
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-sm text-navy-soft">
        Ready to apply?{" "}
        <span className="cursor-pointer text-copper hover:underline">
          Start an application
        </span>
        .
      </p>
    </section>
  );
}

function PreviewForgotPassword() {
  return (
    <section className="mx-auto w-full max-w-md bg-white px-6 py-16">
      <h1 className="text-3xl font-semibold text-navy">Forgot Password</h1>
      <p className="mt-2 text-navy-soft">
        Enter your email address and we&apos;ll send you a link to reset your
        password.
      </p>
      <form className="mt-8 space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label
            className="text-sm font-medium text-navy"
            htmlFor="preview-forgot-email"
          >
            Email
          </label>
          <Input
            id="preview-forgot-email"
            type="email"
            autoComplete="off"
            placeholder="you@example.com"
          />
        </div>
        <Button className="w-full" type="button">
          Send Reset Link
        </Button>
        <p className="text-sm text-navy-soft">
          Remember your password?{" "}
          <span className="cursor-pointer text-copper hover:underline">
            Sign in
          </span>
        </p>
      </form>
    </section>
  );
}

function PreviewResetPassword() {
  return (
    <section className="mx-auto w-full max-w-md bg-white px-6 py-16">
      <h1 className="text-3xl font-semibold text-navy">Reset Password</h1>
      <p className="mt-2 text-navy-soft">
        Enter your new password below to reset your account password.
      </p>
      <form className="mt-8 space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label
            className="text-sm font-medium text-navy"
            htmlFor="preview-new-pw"
          >
            New Password
          </label>
          <Input id="preview-new-pw" type="password" autoComplete="off" />
        </div>
        <div>
          <label
            className="text-sm font-medium text-navy"
            htmlFor="preview-confirm-pw"
          >
            Confirm New Password
          </label>
          <Input id="preview-confirm-pw" type="password" autoComplete="off" />
        </div>
        <div className="rounded-md bg-slate-50 p-3 text-sm text-navy-soft">
          <p className="font-medium text-navy">Password requirements:</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>At least 8 characters</li>
            <li>One uppercase letter</li>
            <li>One lowercase letter</li>
            <li>One number</li>
          </ul>
        </div>
        <Button className="w-full" type="button">
          Reset Password
        </Button>
      </form>
    </section>
  );
}

function PreviewCreatePassword() {
  return (
    <section className="mx-auto w-full max-w-md bg-white px-6 py-16">
      <h1 className="text-3xl font-semibold text-navy">Create Your Password</h1>
      <p className="mt-2 text-navy-soft">
        Almost done! Create a password to secure your account and submit your
        application.
      </p>
      <form className="mt-8 space-y-4" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label
            className="text-sm font-medium text-navy"
            htmlFor="preview-cp-email"
          >
            Email
          </label>
          <Input
            id="preview-cp-email"
            type="email"
            value="jane.doe@example.com"
            disabled
            className="bg-slate-50"
          />
        </div>
        <div>
          <label
            className="text-sm font-medium text-navy"
            htmlFor="preview-cp-pw"
          >
            Password
          </label>
          <Input id="preview-cp-pw" type="password" autoComplete="off" />
        </div>
        <div>
          <label
            className="text-sm font-medium text-navy"
            htmlFor="preview-cp-confirm"
          >
            Confirm Password
          </label>
          <Input id="preview-cp-confirm" type="password" autoComplete="off" />
        </div>
        <div className="rounded-md bg-slate-50 p-3 text-sm text-navy-soft">
          <p className="font-medium text-navy">Password requirements:</p>
          <ul className="mt-1 list-inside list-disc space-y-1">
            <li>At least 8 characters</li>
            <li>One uppercase letter</li>
            <li>One lowercase letter</li>
            <li>One number</li>
          </ul>
        </div>
        <Button className="w-full" type="button">
          Submit Application
        </Button>
      </form>
    </section>
  );
}

function PreviewResearchInvalidLink() {
  return (
    <div className="min-h-[400px] bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl space-y-6 py-12 text-center">
          <h1 className="text-2xl font-bold text-navy">Invalid Link</h1>
          <p className="text-navy-soft">
            This research invitation link is missing required information.
            Please check your email for the correct link or contact support.
          </p>
        </div>
      </div>
    </div>
  );
}

function PreviewResearchInviteError() {
  return (
    <div className="min-h-[400px] bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl space-y-6 py-12">
          <div className="text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-12 w-12 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-navy">
              Invalid Research Invitation
            </h1>
            <p className="text-navy-soft">
              Invalid or expired research invitation link.
            </p>
          </div>
          <div className="text-center">
            <Button>Return to Homepage</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewResearchThankYou() {
  return (
    <section className="mx-auto w-full max-w-3xl bg-white px-6 py-16 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-copper text-4xl text-white">
        &#10003;
      </div>
      <h1 className="mt-6 text-3xl font-semibold text-navy">Thank You!</h1>
      <p className="mt-3 text-navy-soft">
        Your responses have been recorded. We appreciate your help in improving
        our compatibility questionnaire.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Application Status previews (re-use ExistingApplicationStatus logic)
// ---------------------------------------------------------------------------

function PreviewExistingStatus({ statusKey }: { statusKey: string }) {
  const statusContent: Record<
    string,
    { icon: string; title: string; description: string; actionText: string }
  > = {
    DRAFT: {
      icon: "\uD83D\uDCDD",
      title: "Application in Progress",
      description:
        "You have an application in progress. Continue where you left off to complete your submission.",
      actionText: "View Dashboard",
    },
    SUBMITTED: {
      icon: "\u2713",
      title: "Application Submitted",
      description:
        "Your application has been submitted and is currently under review. We'll notify you once we've reviewed your submission.",
      actionText: "View Dashboard",
    },
    PAYMENT_PENDING: {
      icon: "\uD83D\uDCB3",
      title: "Payment Pending",
      description:
        "Your application is ready, but payment is required to complete the process. Please complete your payment to proceed.",
      actionText: "Complete Payment",
    },
    SCREENING_IN_PROGRESS: {
      icon: "\uD83D\uDD0D",
      title: "Application Under Review",
      description:
        "We're currently reviewing your application. This process typically takes 3-5 business days. We'll send you an email once the review is complete.",
      actionText: "View Dashboard",
    },
    APPROVED: {
      icon: "\uD83C\uDF89",
      title: "Application Approved!",
      description:
        "Congratulations! Your application has been approved. You can now access your matches and view upcoming events.",
      actionText: "Go to Dashboard",
    },
    WAITLIST_INVITED: {
      icon: "\uD83C\uDF8A",
      title: "You've Been Invited!",
      description:
        "Great news! You've been invited off the waitlist to complete your full application. Click below to continue with the next steps.",
      actionText: "Complete Application",
    },
    RESEARCH_INVITED: {
      icon: "\uD83E\uDDEA",
      title: "Research Invitation Ready",
      description:
        "You have been invited to help validate our questionnaire. Click below to begin.",
      actionText: "Start Research Questionnaire",
    },
    RESEARCH_IN_PROGRESS: {
      icon: "\uD83E\uDDEA",
      title: "Research Questionnaire in Progress",
      description:
        "Thanks for helping with our research. Continue where you left off.",
      actionText: "Continue Research Questionnaire",
    },
    RESEARCH_COMPLETED: {
      icon: "\u2705",
      title: "Research Completed",
      description:
        "Thank you for completing the research questionnaire. Your responses have been recorded.",
      actionText: "Return Home",
    },
  };

  if (statusKey === "SOFT_REJECTED") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center space-y-6 text-center">
          <div className="text-6xl">{"\u231B"}</div>
          <h1 className="text-3xl font-semibold text-navy">
            Application Under Review
          </h1>
          <p className="max-w-2xl text-lg text-navy-soft">
            We&apos;re currently reviewing your application. We&apos;ll notify
            you once we&apos;ve completed the review.
          </p>
          <p className="pt-4 text-xs text-slate-400">
            Application ID: {mockApplicant().id}
          </p>
        </div>
      </div>
    );
  }

  const content = statusContent[statusKey];
  if (!content) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col items-center space-y-6 text-center">
        <div className="text-6xl">{content.icon}</div>
        <h1 className="text-3xl font-semibold text-navy">{content.title}</h1>
        <p className="max-w-2xl text-lg text-navy-soft">
          {content.description}
        </p>
        <div className="pt-4">
          <button className="inline-block rounded-md bg-navy px-8 py-4 text-base font-medium text-white transition-colors hover:bg-copper">
            {content.actionText}
          </button>
        </div>
        <p className="pt-4 text-xs text-slate-400">
          Application ID: {mockApplicant().id}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Applicant dashboard previews (static mocks — no API calls)
// ---------------------------------------------------------------------------

function PreviewDashboard() {
  return (
    <div className="space-y-6 bg-slate-50 p-6">
      <h1 className="text-2xl font-semibold text-navy">Dashboard</h1>
      <Card>
        <h2 className="text-lg font-semibold text-navy">Overview</h2>
        <p className="mt-2 text-sm text-navy-soft">
          Application status: APPROVED
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-2xl font-semibold">3</div>
            <div className="text-sm text-navy-soft">Events attended</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">5</div>
            <div className="text-sm text-navy-soft">Matches received</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">2</div>
            <div className="text-sm text-navy-soft">Dates completed</div>
          </div>
        </div>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-navy">Upcoming Events</h2>
          <ul className="mt-4 space-y-2 text-sm text-navy-soft">
            <li className="flex items-center justify-between">
              <span>Speed Dating Night &middot; 3/15/2026</span>
              <span>INVITED</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Mixer at The Loft &middot; 4/2/2026</span>
              <span>PENDING</span>
            </li>
          </ul>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold text-navy">Recent Matches</h2>
          <ul className="mt-4 space-y-2 text-sm text-navy-soft">
            <li className="flex items-center justify-between">
              <span>Alex &middot; Speed Dating Night</span>
              <span>MUTUAL</span>
            </li>
            <li className="flex items-center justify-between">
              <span>Jordan &middot; Mixer at The Loft</span>
              <span>PENDING</span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

function PreviewApplicationPage() {
  return (
    <div className="space-y-4 bg-slate-50 p-6">
      <h1 className="text-2xl font-semibold text-navy">Application</h1>
      <p className="text-navy-soft">
        Track your application status and next steps.
      </p>
    </div>
  );
}

function PreviewEventsPage() {
  return (
    <div className="space-y-4 bg-slate-50 p-6">
      <h1 className="text-2xl font-semibold text-navy">Events</h1>
      <Card>
        <h2 className="text-lg font-semibold text-navy">Upcoming Events</h2>
        <ul className="mt-4 space-y-2 text-sm text-navy-soft">
          <li className="flex items-center justify-between">
            <span>Speed Dating Night &middot; 3/15/2026</span>
            <span>INVITED</span>
          </li>
          <li className="flex items-center justify-between">
            <span>Mixer at The Loft &middot; 4/2/2026</span>
            <span>PENDING</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}

function PreviewEventDetail() {
  return (
    <div className="space-y-4 bg-slate-50 p-6">
      <h1 className="text-2xl font-semibold text-navy">
        Event: Speed Dating Night
      </h1>
      <p className="text-navy-soft">Event details will load from the API.</p>
    </div>
  );
}

function PreviewMatchesPage() {
  return (
    <div className="space-y-4 bg-slate-50 p-6">
      <h1 className="text-2xl font-semibold text-navy">Matches</h1>
      <Card>
        <h2 className="text-lg font-semibold text-navy">Recent Matches</h2>
        <ul className="mt-4 space-y-2 text-sm text-navy-soft">
          <li className="flex items-center justify-between">
            <span>Alex &middot; Speed Dating Night</span>
            <span>MUTUAL</span>
          </li>
          <li className="flex items-center justify-between">
            <span>Jordan &middot; Mixer at The Loft</span>
            <span>PENDING</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}

function PreviewMatchDetail() {
  return (
    <div className="space-y-4 bg-slate-50 p-6">
      <h1 className="text-2xl font-semibold text-navy">Match: Alex</h1>
      <p className="text-navy-soft">Match details will load from the API.</p>
    </div>
  );
}

function PreviewSettingsPage() {
  return (
    <div className="space-y-4 bg-slate-50 p-6">
      <h1 className="text-2xl font-semibold text-navy">Settings</h1>
      <p className="text-navy-soft">
        Manage notification preferences and account details.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Status key mapping
// ---------------------------------------------------------------------------

const STATUS_KEY_MAP: Record<string, string> = {
  "status-soft-rejected": "SOFT_REJECTED",
  "status-draft": "DRAFT",
  "status-submitted": "SUBMITTED",
  "status-payment-pending": "PAYMENT_PENDING",
  "status-screening": "SCREENING_IN_PROGRESS",
  "status-approved": "APPROVED",
  "status-waitlist-invited": "WAITLIST_INVITED",
  "status-research-invited": "RESEARCH_INVITED",
  "status-research-in-progress": "RESEARCH_IN_PROGRESS",
  "status-research-completed": "RESEARCH_COMPLETED",
};

// ---------------------------------------------------------------------------
// View renderer
// ---------------------------------------------------------------------------

function ViewRenderer({ viewId }: { viewId: string }) {
  switch (viewId) {
    // Public
    case "homepage":
      return <PreviewHomepage />;
    // Auth
    case "sign-in":
      return <PreviewSignIn />;
    case "forgot-password":
      return <PreviewForgotPassword />;
    case "reset-password":
      return <PreviewResetPassword />;
    case "create-password":
      return <PreviewCreatePassword />;
    // Research
    case "research-invalid-link":
      return <PreviewResearchInvalidLink />;
    case "research-invite-error":
      return <PreviewResearchInviteError />;
    case "research-thank-you":
      return <PreviewResearchThankYou />;
    // Application Status
    case "status-soft-rejected":
    case "status-draft":
    case "status-submitted":
    case "status-payment-pending":
    case "status-screening":
    case "status-approved":
    case "status-waitlist-invited":
    case "status-research-invited":
    case "status-research-in-progress":
    case "status-research-completed":
      return (
        <div className="mx-auto max-w-3xl px-6 py-16">
          <PreviewExistingStatus statusKey={STATUS_KEY_MAP[viewId]} />
        </div>
      );
    // Applicant
    case "dashboard":
      return <PreviewDashboard />;
    case "application-page":
      return <PreviewApplicationPage />;
    case "events-list":
      return <PreviewEventsPage />;
    case "event-detail":
      return <PreviewEventDetail />;
    case "matches-list":
      return <PreviewMatchesPage />;
    case "match-detail":
      return <PreviewMatchDetail />;
    case "settings":
      return <PreviewSettingsPage />;
    default:
      return (
        <p className="p-8 text-center text-navy-soft">
          Preview not available for this view.
        </p>
      );
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TestViewsPage() {
  const [activeCategory, setActiveCategory] = useState<ViewCategory>("public");
  const [activeView, setActiveView] = useState<string>(VIEWS[0].id);

  const filteredViews = VIEWS.filter((v) => v.category === activeCategory);
  const selectedView = VIEWS.find((v) => v.id === activeView);

  const handleCategoryChange = (cat: ViewCategory) => {
    setActiveCategory(cat);
    const firstInCategory = VIEWS.find((v) => v.category === cat);
    if (firstInCategory) {
      setActiveView(firstInCategory.id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Test Views</h1>
          <p className="text-gray-600">
            Preview all user-facing views in one place. These are static
            previews with mock data &mdash; no real data is fetched or modified.
          </p>
        </div>

        {/* Category tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {VIEW_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? "bg-blue-600 text-white shadow-md"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {cat.label}
              <span className="ml-1.5 text-xs opacity-70">
                ({VIEWS.filter((v) => v.category === cat.id).length})
              </span>
            </button>
          ))}
        </div>

        {/* View selector within category */}
        <div className="mb-6 flex flex-wrap gap-2">
          {filteredViews.map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                activeView === view.id
                  ? "bg-gray-900 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:border-gray-400"
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>

        {/* View info bar */}
        {selectedView && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedView.label}
              </h2>
              <p className="text-sm text-gray-500">
                {selectedView.description}
              </p>
            </div>
            <code className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
              {selectedView.route}
            </code>
          </div>
        )}

        {/* Preview area */}
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {/* Browser chrome */}
          <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-yellow-400" />
              <div className="h-3 w-3 rounded-full bg-green-400" />
            </div>
            <div className="ml-3 flex-1 rounded-md bg-white px-3 py-1 text-xs text-gray-400">
              realitymatchmaking.com{selectedView?.route ?? ""}
            </div>
          </div>

          {/* Preview content */}
          <div className="min-h-[500px]">
            <ViewRenderer viewId={activeView} />
          </div>
        </div>

        {/* Coverage summary */}
        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="mb-2 font-semibold text-blue-900">Coverage Summary</h3>
          <p className="text-sm text-blue-800">
            This page covers <strong>{VIEWS.length} views</strong> not included
            in{" "}
            <Link
              href="/admin/preview-application"
              className="font-medium underline hover:text-blue-600"
            >
              Preview Flow
            </Link>{" "}
            (7 application stages) or{" "}
            <Link
              href="/admin/test-emails"
              className="font-medium underline hover:text-blue-600"
            >
              Test Emails
            </Link>{" "}
            /{" "}
            <Link
              href="/admin/preview-emails"
              className="font-medium underline hover:text-blue-600"
            >
              Email Previews
            </Link>{" "}
            (8 email templates). Together, these three admin tools provide
            complete visibility of all user-facing screens.
          </p>
        </div>
      </div>
    </div>
  );
}
