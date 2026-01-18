type AdminEventAnalyticsProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminEventAnalyticsPage({
  params,
}: AdminEventAnalyticsProps) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Event Analytics {id}</h1>
      <p className="text-navy-soft">Detailed event metrics.</p>
    </div>
  );
}
