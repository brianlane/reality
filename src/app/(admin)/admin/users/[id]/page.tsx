import AdminUserForm from "@/components/admin/AdminUserForm";

type AdminUserDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminUserDetailPage({
  params,
}: AdminUserDetailProps) {
  const { id } = await params;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">User Detail</h1>
      <AdminUserForm mode="edit" userId={id} />
    </div>
  );
}
