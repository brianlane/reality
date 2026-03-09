import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { createPaymentCheckout } from "@/lib/stripe";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function POST(request: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }

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
      applicationStatus: true,
      softRejectedAt: true,
      user: { select: { email: true } },
    },
  });

  if (!applicant) {
    return errorResponse("NOT_FOUND", "Application not found", 404);
  }

  // Ownership check: requesting user must own this applicant record
  if (
    !auth.email ||
    applicant.user.email.toLowerCase() !== auth.email.toLowerCase()
  ) {
    return errorResponse("FORBIDDEN", "You do not own this application", 403);
  }

  if (type === "APPLICATION_FEE") {
    if (applicant.softRejectedAt) {
      return errorResponse(
        "APPLICATION_LOCKED",
        "Application can no longer be paid.",
        403,
      );
    }
    if (applicant.applicationStatus !== "PAYMENT_PENDING") {
      return errorResponse(
        "VALIDATION_ERROR",
        "Application is not in a payable state",
        400,
      );
    }
  }

  if (type === "EVENT_FEE") {
    if (!eventId) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Event ID required for event fee",
        400,
      );
    }
    // Verify an active event invitation exists
    const invitation = await db.eventInvitation.findFirst({
      where: {
        applicantId,
        eventId,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
    });
    if (!invitation) {
      return errorResponse(
        "VALIDATION_ERROR",
        "No active event invitation found",
        400,
      );
    }
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
