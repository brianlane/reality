import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { verifyStripeWebhook } from "@/lib/stripe";
import { sendPaymentConfirmationEmail } from "@/lib/email/payment";
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorResponse(
      "FORBIDDEN",
      `Webhook verification failed: ${errorMessage}`,
      403,
    );
  }

  try {
    // Extract metadata and Stripe Payment Intent ID based on event type
    let paymentId: string | undefined;
    let stripePaymentIntentId: string | undefined;

    if (
      event.type === "payment_intent.succeeded" ||
      event.type === "payment_intent.payment_failed"
    ) {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      paymentId = paymentIntent.metadata?.paymentId;
      stripePaymentIntentId = paymentIntent.id;
    } else if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      paymentId = session.metadata?.paymentId;
      // Extract the Payment Intent ID from the checkout session
      stripePaymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id;
    } else if (event.type === "charge.refunded") {
      // Handle refunds initiated from Stripe Dashboard
      const charge = event.data.object as Stripe.Charge;
      const refundedPaymentIntentId =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;

      if (refundedPaymentIntentId) {
        const existingPayment = await db.payment.findUnique({
          where: { stripePaymentId: refundedPaymentIntentId },
        });

        if (existingPayment && existingPayment.status !== "REFUNDED") {
          await db.payment.update({
            where: { id: existingPayment.id },
            data: { status: "REFUNDED" },
          });
        }
      }

      return successResponse({ received: true, eventId: event.id });
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
      // Idempotency / terminal-state check: skip if payment is already in
      // the target status, or if it has reached REFUNDED (a terminal state
      // that must never regress back to SUCCEEDED via a delayed webhook).
      const existingPayment = await db.payment.findUnique({
        where: { id: paymentId },
        select: { status: true },
      });

      if (
        existingPayment &&
        (existingPayment.status === status ||
          existingPayment.status === "REFUNDED")
      ) {
        return successResponse({ received: true, eventId: event.id });
      }

      const payment = await db.payment.update({
        where: { id: paymentId },
        data: {
          status,
          // Store the Stripe Payment Intent ID for future refunds
          ...(stripePaymentIntentId
            ? { stripePaymentId: stripePaymentIntentId }
            : {}),
        },
        select: {
          applicantId: true,
          type: true,
          amount: true,
          stripePaymentId: true,
          applicant: {
            select: {
              user: {
                select: {
                  email: true,
                  firstName: true,
                },
              },
            },
          },
        },
      });

      if (status === "SUCCEEDED" && payment.type === "APPLICATION_FEE") {
        await db.applicant.update({
          where: { id: payment.applicantId },
          data: {
            applicationStatus: "DRAFT",
          },
        });

        // Send payment confirmation email
        try {
          // Use dashboard/payments URL for receipt access
          const receiptUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard/payments`;

          await sendPaymentConfirmationEmail({
            to: payment.applicant.user.email,
            firstName: payment.applicant.user.firstName,
            amount: payment.amount,
            currency: "usd",
            receiptUrl,
            applicantId: payment.applicantId,
          });
        } catch (emailError) {
          console.error(
            "Failed to send payment confirmation email:",
            emailError,
          );
          // Don't fail the webhook if email fails
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return errorResponse(
      "INTERNAL_SERVER_ERROR",
      `Webhook processing failed: ${errorMessage}`,
      500,
    );
  }

  return successResponse({ received: true, eventId: event.id });
}
