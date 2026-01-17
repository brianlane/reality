type MatchDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function ApplicantMatchDetailPage({
  params,
}: MatchDetailProps) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Match {id}</h1>
      <p className="text-slate-600">Match details will load from the API.</p>
    </div>
  );
}
