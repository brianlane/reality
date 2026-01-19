import AdminApplicationsTable from "@/components/admin/AdminApplicationsTable";

export default function AdminApplicationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Applications</h1>
      <AdminApplicationsTable />
    </div>
  );
}
