import AdminMatchesTable from "@/components/admin/AdminMatchesTable";
import AdminLocationBreakdown from "@/components/admin/AdminLocationBreakdown";

export default function AdminMatchesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Matches</h1>
      <AdminMatchesTable />
      <AdminLocationBreakdown type="matches" />
    </div>
  );
}
