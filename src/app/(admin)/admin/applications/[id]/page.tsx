type AdminApplicationDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminApplicationDetailPage({
  params,
}: AdminApplicationDetailProps) {
  const { id } = await params;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">
        Application {id}
      </h1>
      <p className="text-navy-soft">Review and make a decision.</p>
    </div>
  );
}
