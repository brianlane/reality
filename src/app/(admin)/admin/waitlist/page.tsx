import AdminWaitlistTable from "@/components/admin/AdminWaitlistTable";

export default function AdminWaitlistPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Waitlist Management</h1>
        <p className="mt-1 text-sm text-navy-soft">
          Review and invite applicants from the waitlist
        </p>
      </div>
      <AdminWaitlistTable />
    </div>
  );
}
