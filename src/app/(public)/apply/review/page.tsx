import Link from "next/link";
import ReviewSummary from "@/components/forms/ReviewSummary";

export default function ReviewPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-navy">Review</h1>
      <p className="mt-2 text-navy-soft">
        Step 4 of 5: Confirm your details before payment.
      </p>
      <div className="mt-6 space-y-4">
        <ReviewSummary />
        <Link
          href="/apply/payment"
          className="inline-flex rounded-md bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-copper"
        >
          Continue to payment
        </Link>
      </div>
    </section>
  );
}
