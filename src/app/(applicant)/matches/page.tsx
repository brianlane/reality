import ApplicantMatchesList from "@/components/dashboard/ApplicantMatchesList";

export default function ApplicantMatchesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Matches</h1>
      <ApplicantMatchesList />
    </div>
  );
}
