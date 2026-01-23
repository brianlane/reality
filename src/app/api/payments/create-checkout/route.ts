import { db } from "@/lib/db";
import { createCheckoutSession } from "@/lib/stripe";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function POST(request: Request) {
  const body = await request.json();
  const { type, applicantId, eventId } = body ?? {};

  if (!type || !applicantId) {
    return errorResponse("VALIDATION_ERROR", "Missing required fields", 400);
  }

  const amount = type === "EVENT_FEE" ? 74900 : 19900;

  if (type === "APPLICATION_FEE") {
    const applicant = await db.applicant.findUnique({
      where: { id: applicantId },
      select: { softRejectedAt: true },
    });
    if (!applicant) {
      return errorResponse("NOT_FOUND", "Application not found", 404);
    }
    if (applicant.softRejectedAt) {
      return errorResponse(
        "APPLICATION_LOCKED",
        "Application can no longer be paid.",
        403,
      );
    }
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

  const session = await createCheckoutSession({
    priceId: type,
    successUrl: "/",
    cancelUrl: "/apply/payment",
    metadata: { paymentId: payment.id },
  });

  return successResponse({
    sessionUrl: session.url,
    sessionId: session.id,
  });
}
