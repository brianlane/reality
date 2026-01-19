import ApplicantDashboardSummary from "@/components/dashboard/ApplicantDashboardSummary";
import ApplicantEventsList from "@/components/dashboard/ApplicantEventsList";
import ApplicantMatchesList from "@/components/dashboard/ApplicantMatchesList";

export default function ApplicantDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-navy">Dashboard</h1>
      <ApplicantDashboardSummary />
      <div className="grid gap-6 lg:grid-cols-2">
        <ApplicantEventsList />
        <ApplicantMatchesList />
      </div>
    </div>
  );
}
