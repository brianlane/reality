"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useApplicationDraft } from "./useApplicationDraft";

export default function PaymentAction({
  previewMode = false,
}: {
  previewMode?: boolean;
}) {
  const { draft } = useApplicationDraft();
  const [status, setStatus] = useState<string | null>(null);

  async function handlePayment() {
    if (previewMode) {
      setStatus("Preview mode - payment processing is disabled");
      return;
    }

    if (!draft.applicationId) {
      setStatus("Complete the application first.");
      return;
    }

    const response = await fetch("/api/applications/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applicationId: draft.applicationId }),
    });

    if (!response.ok) {
      setStatus("Payment initialization failed.");
      return;
    }

    const data = await response.json();
    setStatus(`Payment session created: ${data.paymentUrl}`);
  }

  return (
    <div className="space-y-3">
      <Button type="button" onClick={handlePayment}>
        Start payment
      </Button>
      {status && <p className="text-sm text-navy-soft">{status}</p>}
    </div>
  );
}
