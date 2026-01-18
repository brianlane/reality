import ApplicantEventsList from "@/components/dashboard/ApplicantEventsList";

export default function ApplicantEventsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Events</h1>
      <ApplicantEventsList />
    </div>
  );
}
