import Link from "next/link";

export default function ApplicationPaymentSuccessPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-semibold text-navy">Payment Successful</h1>
        <p className="mx-auto mt-3 max-w-md text-navy-soft">
          Thank you! Your application fee has been received. You can now
          continue with your application.
        </p>

        <div className="mt-8 rounded-lg bg-slate-50 p-6 text-left">
          <h2 className="font-medium text-navy">Next Steps</h2>
          <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-navy-soft">
            <li>
              <strong>Set up your account</strong> &mdash; Create your password
              to access your dashboard
            </li>
            <li>
              <strong>Complete the questionnaire</strong> &mdash; Help us
              understand your preferences and personality
            </li>
            <li>
              <strong>Background verification</strong> &mdash; Complete your
              identity and background check
            </li>
            <li>
              <strong>Application review</strong> &mdash; Our team will review
              your complete profile
            </li>
          </ol>
        </div>

        <div className="mt-8">
          <Link
            href="/apply"
            className="inline-block rounded-lg bg-navy px-6 py-3 font-medium text-white transition-colors hover:bg-navy/90"
          >
            Continue Application
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          A confirmation email has been sent to your email address with payment
          details.
        </p>
      </div>
    </section>
  );
}
