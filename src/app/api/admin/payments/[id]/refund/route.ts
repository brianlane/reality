import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";
import { createRefund } from "@/lib/stripe";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: RouteContext) {
  const { id } = await params;
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  if (!auth.email) {
    return errorResponse("UNAUTHORIZED", "Email not available", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const existing = await db.payment.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("NOT_FOUND", "Payment not found", 404);
  }

  if (existing.status === "REFUNDED") {
    return errorResponse(
      "VALIDATION_ERROR",
      "Payment has already been refunded",
      400,
    );
  }

  if (existing.status !== "SUCCEEDED") {
    return errorResponse(
      "VALIDATION_ERROR",
      "Only succeeded payments can be refunded",
      400,
    );
  }

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  // If the payment has a Stripe Payment Intent ID, issue a real refund
  let stripeRefundId: string | undefined;
  const hasStripePayment = !!existing.stripePaymentId;

  if (hasStripePayment) {
    try {
      const refund = await createRefund(existing.stripePaymentId!);
      stripeRefundId = refund.id;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return errorResponse(
        "INTERNAL_SERVER_ERROR",
        `Stripe refund failed: ${errorMessage}`,
        500,
      );
    }
  }

  const payment = await db.payment.update({
    where: { id },
    data: { status: "REFUNDED" },
  });

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "MANUAL_ADJUSTMENT",
      targetId: payment.id,
      targetType: "payment",
      description: hasStripePayment
        ? `Stripe refund issued (${stripeRefundId})`
        : "Manual refund issued (no Stripe payment on record)",
      metadata: {
        stripeRefund: hasStripePayment,
        stripeRefundId: stripeRefundId ?? null,
        previousStatus: existing.status,
      },
    },
  });

  return successResponse({
    payment: {
      id: payment.id,
      status: payment.status,
      updatedAt: payment.updatedAt,
    },
  });
}
