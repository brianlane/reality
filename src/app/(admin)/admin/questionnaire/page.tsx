import AdminQuestionnairePagesTable from "@/components/admin/AdminQuestionnairePagesTable";
import AdminQuestionnaireSectionsTable from "@/components/admin/AdminQuestionnaireSectionsTable";
import AdminQuestionnaireQuestionsTable from "@/components/admin/AdminQuestionnaireQuestionsTable";

export default function AdminQuestionnairePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Questionnaire</h1>
        <p className="mt-1 text-sm text-navy-soft">
          Manage questionnaire pages, sections and questions.
        </p>
      </div>
      <AdminQuestionnairePagesTable />
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminQuestionnaireSectionsTable />
        <AdminQuestionnaireQuestionsTable />
      </div>
    </div>
  );
}
