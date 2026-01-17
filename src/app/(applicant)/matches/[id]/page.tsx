type MatchDetailProps = {
  params: { id: string };
};

export default function ApplicantMatchDetailPage({ params }: MatchDetailProps) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">
        Match {params.id}
      </h1>
      <p className="text-slate-600">Match details will load from the API.</p>
    </div>
  );
}
