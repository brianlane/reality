import AdminPaymentsTable from "@/components/admin/AdminPaymentsTable";

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Payments</h1>
      <AdminPaymentsTable />
    </div>
  );
}
