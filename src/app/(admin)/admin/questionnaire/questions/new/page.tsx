import AdminQuestionnaireQuestionForm from "@/components/admin/AdminQuestionnaireQuestionForm";

type AdminQuestionnaireQuestionCreateProps = {
  searchParams: Promise<{ sectionId?: string }>;
};

export default async function AdminQuestionnaireQuestionCreatePage({
  searchParams,
}: AdminQuestionnaireQuestionCreateProps) {
  const params = await searchParams;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">New Question</h1>
      <AdminQuestionnaireQuestionForm
        mode="create"
        initialSectionId={params.sectionId}
      />
    </div>
  );
}
