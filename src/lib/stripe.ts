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

/**
 * Resolves a PaymentType to the corresponding Stripe Price ID from env vars.
 */
function resolveStripePriceId(type: "APPLICATION_FEE" | "EVENT_FEE"): string {
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
    // Propagate metadata to the PaymentIntent so payment_intent.succeeded
    // and payment_intent.payment_failed webhooks can also resolve the
    // internal paymentId. Stripe does NOT copy session metadata automatically.
    payment_intent_data: {
      metadata: params.metadata ?? {},
    },
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

export type PaymentType = "APPLICATION_FEE" | "EVENT_FEE";

const PAYMENT_AMOUNTS: Record<PaymentType, number> = {
  APPLICATION_FEE: 19900,
  EVENT_FEE: 74900,
};

const SUCCESS_PATHS: Record<PaymentType, string> = {
  APPLICATION_FEE: "/apply/payment/success",
  EVENT_FEE: "/events/payment/success",
};

const CANCEL_PATHS: Record<PaymentType, string> = {
  APPLICATION_FEE: "/apply/payment",
  EVENT_FEE: "/events/payment",
};

type CreatePaymentCheckoutParams = {
  type: PaymentType;
  applicantId: string;
  customerEmail: string;
  eventId?: string;
};

/**
 * Shared helper: creates a Payment record in the DB and a Stripe Checkout
 * session. Used by both the application submit route and the generic
 * create-checkout route so the logic stays in one place.
 */
export async function createPaymentCheckout(
  params: CreatePaymentCheckoutParams,
  db: {
    payment: {
      create: (args: {
        data: {
          applicantId: string;
          type: PaymentType;
          amount: number;
          status: "PENDING";
          eventId?: string;
        };
      }) => Promise<{ id: string }>;
    };
  },
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const payment = await db.payment.create({
    data: {
      applicantId: params.applicantId,
      type: params.type,
      amount: PAYMENT_AMOUNTS[params.type],
      status: "PENDING",
      eventId: params.eventId,
    },
  });

  const priceId = resolveStripePriceId(params.type);
  const session = await createCheckoutSession({
    priceId,
    successUrl: `${appUrl}${SUCCESS_PATHS[params.type]}?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${appUrl}${CANCEL_PATHS[params.type]}`,
    customerEmail: params.customerEmail,
    metadata: {
      paymentId: payment.id,
      applicantId: params.applicantId,
      paymentType: params.type,
    },
  });

  return { payment, session };
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

/**
 * Fetches the metadata from a Stripe Payment Intent.
 * Used by webhook handlers to resolve internal payment IDs.
 */
export async function getPaymentIntentMetadata(
  paymentIntentId: string,
): Promise<Record<string, string> | undefined> {
  const stripe = getStripe();

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent.metadata;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch PaymentIntent metadata: ${errorMessage}`);
  }
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
