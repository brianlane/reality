type EventDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function ApplicantEventDetailPage({
  params,
}: EventDetailProps) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Event {id}</h1>
      <p className="text-slate-600">Event details will load from the API.</p>
    </div>
  );
}
