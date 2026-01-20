import AdminPaymentForm from "@/components/admin/AdminPaymentForm";

export default function AdminNewPaymentPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-navy">Create Payment</h1>
      <AdminPaymentForm mode="create" />
    </div>
  );
}
