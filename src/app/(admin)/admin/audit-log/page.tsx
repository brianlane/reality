import ScreeningAuditLogTable from "@/components/admin/ScreeningAuditLogTable";

export default function AuditLogPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Screening Audit Log</h1>
      <p className="text-sm text-navy-soft">
        Compliance audit trail for all background check actions and report
        views.
      </p>
      <ScreeningAuditLogTable />
    </div>
  );
}
