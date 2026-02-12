import Link from "next/link";

export default function EventPaymentSuccessPage() {
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

        <h1 className="text-3xl font-semibold text-navy">
          Event Payment Confirmed
        </h1>
        <p className="mx-auto mt-3 max-w-md text-navy-soft">
          Thank you! Your event fee has been received. You&apos;re all set for
          the upcoming matchmaking event.
        </p>

        <div className="mt-8 rounded-lg bg-slate-50 p-6 text-left">
          <h2 className="font-medium text-navy">What Happens Next</h2>
          <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-navy-soft">
            <li>
              <strong>Event details</strong> &mdash; Check your email for venue,
              date, and preparation information
            </li>
            <li>
              <strong>Your matches</strong> &mdash; View your compatibility
              matches in your dashboard before the event
            </li>
            <li>
              <strong>Attend the event</strong> &mdash; Meet your matches in
              person at the scheduled event
            </li>
          </ol>
        </div>

        <div className="mt-8">
          <Link
            href="/dashboard"
            className="inline-block rounded-lg bg-navy px-6 py-3 font-medium text-white transition-colors hover:bg-navy/90"
          >
            Go to Dashboard
          </Link>
        </div>

        <p className="mt-6 text-xs text-slate-400">
          A confirmation email has been sent to your email address with payment
          and event details.
        </p>
      </div>
    </section>
  );
}
