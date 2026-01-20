import AdminPaymentForm from "@/components/admin/AdminPaymentForm";

type AdminPaymentDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminPaymentDetailPage({
  params,
}: AdminPaymentDetailProps) {
  const { id } = await params;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Payment Detail</h1>
      <AdminPaymentForm mode="edit" paymentId={id} />
    </div>
  );
}
