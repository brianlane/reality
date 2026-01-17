type AdminApplicationDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminApplicationDetailPage({
  params,
}: AdminApplicationDetailProps) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">
        Application {id}
      </h1>
      <p className="text-slate-600">Review and make a decision.</p>
    </div>
  );
}
