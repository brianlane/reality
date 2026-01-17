import ApplicationDraftForm from "@/components/forms/ApplicationDraftForm";

export default function ApplyPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-slate-900">Application</h1>
      <p className="mt-2 text-slate-600">
        Step 1 of 5: Demographics. Complete the form to begin your application.
      </p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <ApplicationDraftForm />
      </div>
    </section>
  );
}
