type AdminEventDetailProps = {
  params: { id: string };
};

export default function AdminEventDetailPage({ params }: AdminEventDetailProps) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">
        Event {params.id}
      </h1>
      <p className="text-slate-600">Event dashboard overview.</p>
    </div>
  );
}
