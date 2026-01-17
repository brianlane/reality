type AdminEventAnalyticsProps = {
  params: { id: string };
};

export default function AdminEventAnalyticsPage({
  params,
}: AdminEventAnalyticsProps) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">
        Event Analytics {params.id}
      </h1>
      <p className="text-slate-600">Detailed event metrics.</p>
    </div>
  );
}
