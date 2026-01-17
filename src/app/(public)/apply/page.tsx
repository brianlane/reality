import ApplicationDraftForm from "@/components/forms/ApplicationDraftForm";

export default function ApplyPage() {
  return (
    <section className="w-full bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-semibold sm:text-4xl">Application</h1>
        <p className="mt-2 text-slate-200">
          Step 1 of 5: Demographics. Complete the form to begin your
          application.
        </p>
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm sm:p-6">
          <ApplicationDraftForm />
        </div>
      </div>
    </section>
  );
}
