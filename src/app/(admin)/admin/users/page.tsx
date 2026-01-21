import AdminUsersTable from "@/components/admin/AdminUsersTable";

export default function AdminUsersPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Users</h1>
      <AdminUsersTable />
    </div>
  );
}
