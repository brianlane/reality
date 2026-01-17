import AdminApplicationsTable from "@/components/admin/AdminApplicationsTable";

export default function AdminApplicationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Applications</h1>
      <AdminApplicationsTable />
    </div>
  );
}
