import AdminMatchesTable from "@/components/admin/AdminMatchesTable";

export default function AdminMatchesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Matches</h1>
      <AdminMatchesTable />
    </div>
  );
}
