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
  const [loading, setLoading] = useState(false);

  async function handlePayment() {
    if (previewMode) {
      setStatus("Preview mode - payment processing is disabled");
      return;
    }

    if (typeof window !== "undefined") {
      const isResearch = localStorage.getItem("researchMode") === "true";
      if (isResearch) {
        setStatus("Research participants do not need to pay.");
        return;
      }
    }

    if (!draft.applicationId) {
      setStatus("Complete the application first.");
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const response = await fetch("/api/applications/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: draft.applicationId }),
      });

      if (!response.ok) {
        setStatus("Payment initialization failed. Please try again.");
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (data.checkoutUrl) {
        setStatus("Redirecting to secure checkout...");
        // Keep loading=true so the button stays disabled until the page unloads
        window.location.href = data.checkoutUrl;
        return;
      }

      setStatus("Unable to create checkout session. Please try again.");
      setLoading(false);
    } catch {
      setStatus("An error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Button type="button" onClick={handlePayment} disabled={loading}>
        {loading ? "Processing..." : "Pay Application Fee"}
      </Button>
      {status && <p className="text-sm text-navy-soft">{status}</p>}
    </div>
  );
}
