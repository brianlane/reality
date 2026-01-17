type EventDetailProps = {
  params: { id: string };
};

export default function ApplicantEventDetailPage({ params }: EventDetailProps) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">
        Event {params.id}
      </h1>
      <p className="text-slate-600">Event details will load from the API.</p>
    </div>
  );
}
