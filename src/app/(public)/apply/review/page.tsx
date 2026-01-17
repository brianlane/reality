import ReviewSummary from "@/components/forms/ReviewSummary";

export default function ReviewPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-slate-900">Review</h1>
      <p className="mt-2 text-slate-600">
        Step 4 of 5: Confirm your details before payment.
      </p>
      <div className="mt-6 space-y-4">
        <ReviewSummary />
        <a
          href="/apply/payment"
          className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Continue to payment
        </a>
      </div>
    </section>
  );
}
