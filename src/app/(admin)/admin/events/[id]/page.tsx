import AdminEventForm from "@/components/admin/AdminEventForm";
import AdminEventMatchingPanel from "@/components/admin/AdminEventMatchingPanel";

type AdminEventDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEventDetailPage({
  params,
}: AdminEventDetailProps) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Event Detail</h1>
      <AdminEventForm mode="edit" eventId={id} />
      <AdminEventMatchingPanel eventId={id} />
    </div>
  );
}
