import Stripe from "stripe";

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(secretKey, {
    apiVersion: "2026-01-28.clover",
  });
};

type CheckoutParams = {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
};

export async function createCheckoutSession(params: CheckoutParams) {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: params.metadata ?? {},
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session: URL is null");
  }

  return {
    id: session.id,
    url: session.url,
    metadata: session.metadata ?? {},
  };
}

export function verifyStripeWebhook(
  payload: string,
  signature: string,
): Stripe.Event {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }

  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Webhook signature verification failed: ${errorMessage}`);
  }
}
