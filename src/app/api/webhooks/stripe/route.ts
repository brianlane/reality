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
    const eventType = parsed?.type;
    let status: "SUCCEEDED" | "FAILED" | null = null;

    if (eventType === "payment_intent.succeeded") {
      status = "SUCCEEDED";
    } else if (eventType === "payment_intent.payment_failed") {
      status = "FAILED";
    } else if (eventType === "checkout.session.completed") {
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
            applicationStatus: "SUBMITTED",
            submittedAt: new Date(),
            screeningStatus: "IN_PROGRESS",
          },
        });
      }
    }
  } catch {
    return errorResponse("VALIDATION_ERROR", "Invalid payload", 400);
  }

  return successResponse({ received: true, eventId: event.id });
}
