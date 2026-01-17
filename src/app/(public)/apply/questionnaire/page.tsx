import QuestionnaireForm from "@/components/forms/QuestionnaireForm";

export default function QuestionnairePage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-slate-900">Questionnaire</h1>
      <p className="mt-2 text-slate-600">
        Step 2 of 5: Answer the compatibility questionnaire.
      </p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <QuestionnaireForm />
      </div>
    </section>
  );
}
