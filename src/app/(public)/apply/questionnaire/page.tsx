import QuestionnaireForm from "@/components/forms/QuestionnaireForm";
import ResearchRouteGuard from "@/components/research/ResearchRouteGuard";

export default function QuestionnairePage() {
  return (
    <ResearchRouteGuard>
      <section className="mx-auto w-full max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-semibold text-navy">Questionnaire</h1>
        <p className="mt-2 text-navy-soft">
          Step 3 of 4: Answer the compatibility questionnaire.
        </p>
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
          <QuestionnaireForm />
        </div>
      </section>
    </ResearchRouteGuard>
  );
}
