type AdminApplicationDetailProps = {
  params: { id: string };
};

export default function AdminApplicationDetailPage({
  params,
}: AdminApplicationDetailProps) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">
        Application {params.id}
      </h1>
      <p className="text-slate-600">Review and make a decision.</p>
    </div>
  );
}
