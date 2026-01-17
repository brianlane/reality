import AdminOverviewSummary from "@/components/admin/AdminOverviewSummary";
import AdminApplicationsTable from "@/components/admin/AdminApplicationsTable";
import AdminEventsTable from "@/components/admin/AdminEventsTable";

export default function AdminOverviewPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Admin Overview</h1>
      <AdminOverviewSummary />
      <div className="grid gap-6 lg:grid-cols-2">
        <AdminApplicationsTable />
        <AdminEventsTable />
      </div>
    </div>
  );
}
