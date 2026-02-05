import Link from "next/link";
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
      <div className="space-y-2">
        {/* Breadcrumb navigation */}
        <nav className="flex items-center gap-2 text-sm text-navy-soft">
          <Link
            href="/admin/questionnaire"
            className="text-copper hover:underline"
          >
            Questionnaire
          </Link>
          <span>/</span>
          <span className="text-navy">Page Detail</span>
        </nav>
        <h1 className="text-2xl font-semibold text-navy">Page Detail</h1>
      </div>
      <AdminQuestionnairePageForm mode="edit" pageId={id} />
      <AdminQuestionnaireSectionsTable pageId={id} />
    </div>
  );
}
