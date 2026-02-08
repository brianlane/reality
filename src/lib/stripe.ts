import Stripe from "stripe";

export const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(secretKey, {
    apiVersion: "2026-01-28.clover",
  });
};

/**
 * Resolves a PaymentType to the corresponding Stripe Price ID from env vars.
 */
export function resolveStripePriceId(
  type: "APPLICATION_FEE" | "EVENT_FEE",
): string {
  const mapping: Record<string, string | undefined> = {
    APPLICATION_FEE: process.env.STRIPE_APPLICATION_FEE_PRICE_ID,
    EVENT_FEE: process.env.STRIPE_EVENT_FEE_PRICE_ID,
  };

  const priceId = mapping[type];
  if (!priceId) {
    throw new Error(
      `Stripe Price ID not configured for payment type: ${type}. ` +
        `Set STRIPE_${type}_PRICE_ID in your environment variables.`,
    );
  }

  return priceId;
}

type CheckoutParams = {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
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
    customer_email: params.customerEmail,
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

/**
 * Creates a refund for a Stripe Payment Intent.
 * Returns the Stripe Refund object.
 */
export async function createRefund(paymentIntentId: string) {
  const stripe = getStripe();

  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
  });

  return refund;
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
