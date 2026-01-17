type AdminEventDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEventDetailPage({
  params,
}: AdminEventDetailProps) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Event {id}</h1>
      <p className="text-slate-600">Event dashboard overview.</p>
    </div>
  );
}
