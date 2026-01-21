import AdminWaitlistDetailForm from "@/components/admin/AdminWaitlistDetailForm";

type AdminWaitlistDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminWaitlistDetailPage({
  params,
}: AdminWaitlistDetailProps) {
  const { id } = await params;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Waitlist Detail</h1>
      <AdminWaitlistDetailForm applicantId={id} />
    </div>
  );
}
