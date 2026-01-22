import AdminQuestionnairePageForm from "@/components/admin/AdminQuestionnairePageForm";

export default function AdminQuestionnairePageCreatePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">New Page</h1>
      <AdminQuestionnairePageForm mode="create" />
    </div>
  );
}
