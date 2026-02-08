import { db } from "@/lib/db";
import { createCheckoutSession, resolveStripePriceId } from "@/lib/stripe";
import { errorResponse, successResponse } from "@/lib/api-response";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(request: Request) {
  const body = await request.json();
  const { type, applicantId, eventId } = body ?? {};

  if (!type || !applicantId) {
    return errorResponse("VALIDATION_ERROR", "Missing required fields", 400);
  }

  if (type !== "APPLICATION_FEE" && type !== "EVENT_FEE") {
    return errorResponse(
      "VALIDATION_ERROR",
      "Invalid payment type. Must be APPLICATION_FEE or EVENT_FEE.",
      400,
    );
  }

  const amount = type === "EVENT_FEE" ? 74900 : 19900;

  const applicant = await db.applicant.findUnique({
    where: { id: applicantId },
    select: {
      softRejectedAt: true,
      user: { select: { email: true } },
    },
  });

  if (!applicant) {
    return errorResponse("NOT_FOUND", "Application not found", 404);
  }

  if (type === "APPLICATION_FEE" && applicant.softRejectedAt) {
    return errorResponse(
      "APPLICATION_LOCKED",
      "Application can no longer be paid.",
      403,
    );
  }

  const payment = await db.payment.create({
    data: {
      applicantId,
      type,
      amount,
      status: "PENDING",
      eventId,
    },
  });

  const priceId = resolveStripePriceId(type);
  const session = await createCheckoutSession({
    priceId,
    successUrl: `${APP_URL}/apply/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${APP_URL}/apply/payment`,
    customerEmail: applicant.user.email,
    metadata: { paymentId: payment.id, applicantId },
  });

  return successResponse({
    sessionUrl: session.url,
    sessionId: session.id,
  });
}
