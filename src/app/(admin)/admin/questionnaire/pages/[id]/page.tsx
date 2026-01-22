import AdminQuestionnairePageForm from "@/components/admin/AdminQuestionnairePageForm";
import AdminQuestionnaireSectionsTable from "@/components/admin/AdminQuestionnaireSectionsTable";

type AdminQuestionnairePageDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminQuestionnairePageDetailPage({
  params,
}: AdminQuestionnairePageDetailProps) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Page Detail</h1>
      </div>
      <AdminQuestionnairePageForm mode="edit" pageId={id} />
      <AdminQuestionnaireSectionsTable pageId={id} />
    </div>
  );
}
