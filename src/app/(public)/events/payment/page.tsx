import Link from "next/link";

export default function EventPaymentPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-navy">Event Fee</h1>
      <p className="mt-2 text-navy-soft">
        Complete your event fee payment to confirm your spot.
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

          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
            <p>
              It looks like your checkout was cancelled. If you&apos;d like to
              try again, you can initiate payment from your{" "}
              <Link href="/dashboard" className="font-medium underline">
                dashboard
              </Link>
              .
            </p>
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
