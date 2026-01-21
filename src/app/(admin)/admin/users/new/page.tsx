import AdminUserForm from "@/components/admin/AdminUserForm";

export default function AdminNewUserPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Create User</h1>
      <AdminUserForm mode="create" />
    </div>
  );
}
