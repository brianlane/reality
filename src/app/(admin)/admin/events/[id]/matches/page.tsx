type AdminEventMatchesProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEventMatchesPage({
  params,
}: AdminEventMatchesProps) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">
        Matches for {id}
      </h1>
      <p className="text-slate-600">Build and review curated matches.</p>
    </div>
  );
}
