import QuestionnaireForm from "@/components/forms/QuestionnaireForm";

export default function ResearchQuestionnairePage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-navy">
        Research Questionnaire
      </h1>
      <p className="mt-2 text-navy-soft">
        Thank you for helping us validate our compatibility questions.
      </p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        <QuestionnaireForm mode="research" />
      </div>
    </section>
  );
}
