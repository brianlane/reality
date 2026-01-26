import AdminUsersTable from "@/components/admin/AdminUsersTable";

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Users & Sessions</h1>
        <p className="mt-1 text-sm text-navy-soft">
          Manage users, view login activity, session history, and account
          details
        </p>
      </div>
      <AdminUsersTable />
    </div>
  );
}
