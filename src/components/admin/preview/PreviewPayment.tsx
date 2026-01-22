"use client";

import PaymentAction from "@/components/forms/PaymentAction";
import { PreviewDraftProvider } from "./PreviewDraftProvider";
import { mockPaymentInfo } from "./mockData";

export default function PreviewPayment() {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Preview Mode:</strong> This is Stage 5 - Payment. Applicants
          pay the application processing fee before proceeding to the
          questionnaire.
        </p>
      </div>

      <div className="bg-white border rounded-lg p-6 space-y-4">
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-navy">
            Application Fee
          </h2>
          <p className="text-navy-soft">
            To proceed with your application, please complete the payment below.
          </p>
        </div>

        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-navy">Application Processing Fee</span>
            <span className="text-lg font-semibold text-navy">
              ${mockPaymentInfo.amount}.00 {mockPaymentInfo.currency}
            </span>
          </div>
        </div>

        <div className="border-t pt-4">
          <PreviewDraftProvider>
            <PaymentAction previewMode={true} />
          </PreviewDraftProvider>
        </div>

        <div className="bg-gray-50 rounded p-4 text-sm text-navy-soft">
          <strong>Note:</strong> In the real application, this would integrate
          with Stripe or another payment processor. The applicant would be
          redirected to a secure payment page, then returned to continue the
          application after successful payment.
        </div>
      </div>
    </div>
  );
}
