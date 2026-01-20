import AdminQuestionnaireSectionForm from "@/components/admin/AdminQuestionnaireSectionForm";

export default function AdminQuestionnaireSectionCreatePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">New Section</h1>
      <AdminQuestionnaireSectionForm mode="create" />
    </div>
  );
}
