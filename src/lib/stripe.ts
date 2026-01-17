type CheckoutParams = {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
};

export async function createCheckoutSession(params: CheckoutParams) {
  return {
    id: `cs_mock_${Date.now()}`,
    url: `https://mock.stripe.local/session/${params.priceId}`,
    metadata: params.metadata ?? {},
  };
}

export function verifyStripeWebhook(payload: string, signature: string) {
  return {
    id: `evt_mock_${Date.now()}`,
    payload,
    signature,
  };
}
