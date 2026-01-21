import PaymentAction from "@/components/forms/PaymentAction";

export default function PaymentPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-navy">Payment</h1>
      <p className="mt-2 text-navy-soft">
        Step 2 of 4: Application fee checkout (mocked in MVP).
      </p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-sm text-navy-soft">
        <p>Payment integration is stubbed for MVP testing.</p>
        <div className="mt-4">
          <PaymentAction />
        </div>
      </div>
    </section>
  );
}
