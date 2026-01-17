type AdminEventMatchesProps = {
  params: { id: string };
};

export default function AdminEventMatchesPage({
  params,
}: AdminEventMatchesProps) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">
        Matches for {params.id}
      </h1>
      <p className="text-slate-600">Build and review curated matches.</p>
    </div>
  );
}
