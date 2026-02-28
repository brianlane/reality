import AdminApplicationForm from "@/components/admin/AdminApplicationForm";
import AdminApplicationTimeline from "@/components/admin/AdminApplicationTimeline";
import AdminQuestionnaireResponses from "@/components/admin/AdminQuestionnaireResponses";

type AdminApplicationDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminApplicationDetailPage({
  params,
}: AdminApplicationDetailProps) {
  const { id } = await params;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-navy">Application Detail</h1>
      <AdminApplicationTimeline applicationId={id} />
      <AdminApplicationForm mode="edit" applicationId={id} />
      <AdminQuestionnaireResponses applicantId={id} />
    </div>
  );
}
