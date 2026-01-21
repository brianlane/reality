import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { adminPaymentUpdateSchema } from "@/lib/validations";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const includeDeleted =
    new URL(request.url).searchParams.get("includeDeleted") === "true";

  const payment = await db.payment.findFirst({
    where: { id, ...(includeDeleted ? {} : { deletedAt: null }) },
    include: {
      applicant: { include: { user: true } },
      event: true,
    },
  });

  if (!payment) {
    return errorResponse("NOT_FOUND", "Payment not found", 404);
  }

  return successResponse({
    payment,
  });
}

export async function PATCH(request: Request, { params }: RouteContext) {
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

  let body: ReturnType<typeof adminPaymentUpdateSchema.parse>;
  try {
    body = adminPaymentUpdateSchema.parse(await request.json());
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400, [
      { message: (error as Error).message },
    ]);
  }

  const existing = await db.payment.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("NOT_FOUND", "Payment not found", 404);
  }

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  // Validate foreign key references before updating payment
  if (body.applicantId !== undefined) {
    const applicant = await db.applicant.findFirst({
      where: {
        id: body.applicantId,
        deletedAt: null,
      },
    });

    if (!applicant) {
      return errorResponse(
        "NOT_FOUND",
        `Applicant with ID ${body.applicantId} not found`,
        404,
      );
    }
  }

  if (body.eventId !== undefined && body.eventId !== null) {
    const event = await db.event.findFirst({
      where: {
        id: body.eventId,
        deletedAt: null,
      },
    });

    if (!event) {
      return errorResponse(
        "NOT_FOUND",
        `Event with ID ${body.eventId} not found`,
        404,
      );
    }
  }

  const payment = await db.payment.update({
    where: { id },
    data: {
      applicantId: body.applicantId,
      eventId: body.eventId === undefined ? undefined : body.eventId,
      type: body.type,
      amount: body.amount,
      status: body.status,
      stripePaymentId:
        body.stripePaymentId === undefined ? undefined : body.stripePaymentId,
      stripeInvoiceId:
        body.stripeInvoiceId === undefined ? undefined : body.stripeInvoiceId,
    },
  });

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "MANUAL_ADJUSTMENT",
      targetId: payment.id,
      targetType: "payment",
      description: "Updated payment",
      metadata: body ?? {},
    },
  });

  return successResponse({ payment });
}

export async function DELETE(_: Request, { params }: RouteContext) {
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

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  const payment = await db.payment.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy: adminUser.id },
  });

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "MANUAL_ADJUSTMENT",
      targetId: payment.id,
      targetType: "payment",
      description: "Soft deleted payment",
    },
  });

  return successResponse({
    payment: {
      id: payment.id,
      deletedAt: payment.deletedAt,
    },
  });
}
