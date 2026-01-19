import ApplicationDraftForm from "@/components/forms/ApplicationDraftForm";

export default function DemographicsPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold text-navy sm:text-4xl">
        Complete Your Profile
      </h1>
      <p className="mt-2 text-navy-soft">
        Step 1 of 4: Demographics. Complete the form to continue your
        application.
      </p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <ApplicationDraftForm />
      </div>
    </section>
  );
}
