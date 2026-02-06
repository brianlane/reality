import Link from "next/link";
import AdminQuestionnaireResponses from "@/components/admin/AdminQuestionnaireResponses";

type ResearchDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminResearchDetailPage({
  params,
}: ResearchDetailProps) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <nav className="flex items-center gap-2 text-sm text-navy-soft">
          <Link href="/admin/research" className="text-copper hover:underline">
            Research Participants
          </Link>
          <span>/</span>
          <span className="text-navy">Responses</span>
        </nav>
        <h1 className="text-2xl font-semibold text-navy">
          Research Participant Responses
        </h1>
      </div>
      <AdminQuestionnaireResponses applicantId={id} />
    </div>
  );
}
