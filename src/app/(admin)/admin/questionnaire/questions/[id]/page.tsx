import AdminQuestionnaireQuestionForm from "@/components/admin/AdminQuestionnaireQuestionForm";

type AdminQuestionnaireQuestionDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminQuestionnaireQuestionDetailPage({
  params,
}: AdminQuestionnaireQuestionDetailProps) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Question Detail</h1>
      <AdminQuestionnaireQuestionForm mode="edit" questionId={id} />
    </div>
  );
}
