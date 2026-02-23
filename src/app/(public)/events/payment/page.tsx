import Link from "next/link";

export default function EventPaymentPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-navy">
        Event Payment Cancelled
      </h1>
      <p className="mt-2 text-navy-soft">
        Your checkout was not completed. No charges have been made.
      </p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <p className="font-medium text-navy">Matchmaking Event Fee</p>
              <p className="mt-1 text-sm text-navy-soft">
                One-time fee to attend a matchmaking event
              </p>
            </div>
            <p className="text-2xl font-semibold text-navy">$749.00</p>
          </div>

          <div className="space-y-2 text-sm text-navy-soft">
            <p className="font-medium text-navy">What&apos;s included:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>Curated matchmaking event experience</li>
              <li>Personalized compatibility matches</li>
              <li>Venue, catering, and event coordination</li>
              <li>Post-event follow-up and feedback</li>
            </ul>
          </div>

          <div className="border-t border-slate-100 pt-4 text-center">
            <p className="mb-4 text-sm text-navy-soft">
              Ready to try again? You can initiate payment from your dashboard.
            </p>
            <Link
              href="/dashboard"
              className="inline-block rounded-lg bg-navy px-6 py-3 font-medium text-white transition-colors hover:bg-navy/90"
            >
              Go to Dashboard
            </Link>
          </div>

          <p className="text-center text-xs text-slate-400">
            Secure payment processed by Stripe. Your payment information is
            never stored on our servers.
          </p>
        </div>
      </div>
    </section>
  );
}
