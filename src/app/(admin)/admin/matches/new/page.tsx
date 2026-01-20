import AdminMatchForm from "@/components/admin/AdminMatchForm";

export default function AdminNewMatchPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Create Match</h1>
      <AdminMatchForm mode="create" />
    </div>
  );
}
