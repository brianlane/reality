import AdminApplicationForm from "@/components/admin/AdminApplicationForm";

export default function AdminNewApplicationPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Create Application</h1>
      <AdminApplicationForm mode="create" />
    </div>
  );
}
