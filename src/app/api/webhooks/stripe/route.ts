import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { verifyStripeWebhook } from "@/lib/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature") ?? "";
  const payload = await request.text();
  const event = verifyStripeWebhook(payload, signature);

  try {
    const parsed = JSON.parse(payload);
    const paymentId = parsed?.data?.object?.metadata?.paymentId;
    const status = parsed?.type === "payment_intent.succeeded" ? "SUCCEEDED" : "FAILED";

    if (paymentId) {
      await db.payment.update({
        where: { id: paymentId },
        data: { status },
      });
    }
  } catch {
    return errorResponse("VALIDATION_ERROR", "Invalid payload", 400);
  }

  return successResponse({ received: true, eventId: event.id });
}
