import AdminMatchForm from "@/components/admin/AdminMatchForm";

type AdminMatchDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminMatchDetailPage({
  params,
}: AdminMatchDetailProps) {
  const { id } = await params;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Match Detail</h1>
      <AdminMatchForm mode="edit" matchId={id} />
    </div>
  );
}
