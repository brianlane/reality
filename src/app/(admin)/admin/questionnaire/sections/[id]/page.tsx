import AdminQuestionnaireSectionForm from "@/components/admin/AdminQuestionnaireSectionForm";
import AdminQuestionnaireQuestionsTable from "@/components/admin/AdminQuestionnaireQuestionsTable";

type AdminQuestionnaireSectionDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminQuestionnaireSectionDetailPage({
  params,
}: AdminQuestionnaireSectionDetailProps) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Section Detail</h1>
      </div>
      <AdminQuestionnaireSectionForm mode="edit" sectionId={id} />
      <AdminQuestionnaireQuestionsTable sectionId={id} hideSection />
    </div>
  );
}
