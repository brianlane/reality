import AdminApplicationsTable from "@/components/admin/AdminApplicationsTable";
import AdminLocationBreakdown from "@/components/admin/AdminLocationBreakdown";

export default function AdminApplicationsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Applications</h1>
      <AdminApplicationsTable />
      <AdminLocationBreakdown type="applications" />
    </div>
  );
}
