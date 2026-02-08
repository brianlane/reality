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
      // Atomic conditional update: use updateMany with a WHERE clause on
      // the current status so the database enforces that only ONE concurrent
      // webhook handler can transition the payment. The loser gets count=0.
      //
      // Blocked statuses (update will be skipped if current status is):
      //  - Same as target (idempotent, already processed)
      //  - REFUNDED (terminal, must never regress)
      //  - SUCCEEDED when target is FAILED (stale failure from earlier attempt)
      const blockedStatuses: string[] = [status, "REFUNDED"];
      if (status === "FAILED") {
        blockedStatuses.push("SUCCEEDED");
      }

      const updated = await db.payment.updateMany({
        where: {
          id: paymentId,
          status: { notIn: blockedStatuses as never },
        },
        data: {
          status,
          ...(stripePaymentIntentId
            ? { stripePaymentId: stripePaymentIntentId }
            : {}),
        },
      });

      // If no rows were updated, another handler already processed this
      // event or the payment is in a terminal state — exit early.
      if (updated.count === 0) {
        return successResponse({ received: true, eventId: event.id });
      }

      // Fetch the payment data needed for post-processing (email, status update)
      const payment = await db.payment.findUnique({
        where: { id: paymentId },
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

      if (!payment) {
        return successResponse({ received: true, eventId: event.id });
      }

      if (status === "SUCCEEDED") {
        // Application-specific: advance applicant status after application fee
        if (payment.type === "APPLICATION_FEE") {
          await db.applicant.update({
            where: { id: payment.applicantId },
            data: {
              applicationStatus: "DRAFT",
            },
          });
        }

        // Send payment confirmation email for all successful payments
        try {
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
