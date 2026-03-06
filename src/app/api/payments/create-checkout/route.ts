import { db } from "@/lib/db";
import { createPaymentCheckout } from "@/lib/stripe";
import { errorResponse, successResponse } from "@/lib/api-response";

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

  const { session } = await createPaymentCheckout(
    {
      type,
      applicantId,
      customerEmail: applicant.user.email,
      eventId,
    },
    db,
  );

  return successResponse({
    sessionUrl: session.url,
    sessionId: session.id,
  });
}
