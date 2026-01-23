import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { verifyStripeWebhook } from "@/lib/stripe";
import type Stripe from "stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return errorResponse("VALIDATION_ERROR", "Missing signature", 400);
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = verifyStripeWebhook(payload, signature);
  } catch (error) {
    return errorResponse(
      "FORBIDDEN",
      `Webhook verification failed: ${(error as Error).message}`,
      403,
    );
  }

  try {
    // Extract metadata based on event type
    let paymentId: string | undefined;
    if (
      event.type === "payment_intent.succeeded" ||
      event.type === "payment_intent.payment_failed"
    ) {
      paymentId = (event.data.object as { metadata?: { paymentId?: string } })
        .metadata?.paymentId;
    } else if (event.type === "checkout.session.completed") {
      paymentId = (event.data.object as { metadata?: { paymentId?: string } })
        .metadata?.paymentId;
    }

    let status: "SUCCEEDED" | "FAILED" | null = null;

    if (event.type === "payment_intent.succeeded") {
      status = "SUCCEEDED";
    } else if (event.type === "payment_intent.payment_failed") {
      status = "FAILED";
    } else if (event.type === "checkout.session.completed") {
      status = "SUCCEEDED";
    }

    if (paymentId && status) {
      const payment = await db.payment.update({
        where: { id: paymentId },
        data: { status },
        select: { applicantId: true, type: true },
      });

      if (status === "SUCCEEDED" && payment.type === "APPLICATION_FEE") {
        await db.applicant.update({
          where: { id: payment.applicantId },
          data: {
            applicationStatus: "DRAFT",
          },
        });
      }
    }
  } catch (error) {
    return errorResponse(
      "INTERNAL_SERVER_ERROR",
      `Webhook processing failed: ${(error as Error).message}`,
      500,
    );
  }

  return successResponse({ received: true, eventId: event.id });
}
