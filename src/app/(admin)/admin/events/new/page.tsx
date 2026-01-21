import AdminEventForm from "@/components/admin/AdminEventForm";

export default function AdminNewEventPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Create Event</h1>
      <AdminEventForm mode="create" />
    </div>
  );
}
