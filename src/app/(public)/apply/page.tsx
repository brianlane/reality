import Stage1QualificationForm from "@/components/forms/Stage1QualificationForm";

export default function ApplyPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold text-navy sm:text-4xl">
        Join the Waitlist
      </h1>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <Stage1QualificationForm />
      </div>
    </section>
  );
}
