import AdminEventsTable from "@/components/admin/AdminEventsTable";

export default function AdminEventsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Events</h1>
      <AdminEventsTable />
    </div>
  );
}
