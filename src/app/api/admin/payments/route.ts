import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { adminPaymentCreateSchema } from "@/lib/validations";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";

export async function GET(request: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const type = url.searchParams.get("type") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const eventId = url.searchParams.get("eventId") ?? undefined;
  const applicantId = url.searchParams.get("applicantId") ?? undefined;
  const includeDeleted = url.searchParams.get("includeDeleted") === "true";

  const where = {
    ...(type ? { type: type as never } : {}),
    ...(status ? { status: status as never } : {}),
    ...(eventId ? { eventId } : {}),
    ...(applicantId ? { applicantId } : {}),
    ...(includeDeleted ? {} : { deletedAt: null }),
  };

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where,
      include: {
        applicant: { include: { user: true } },
        event: { select: { id: true, name: true, date: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.payment.count({ where }),
  ]);

  return successResponse({
    payments: payments.map((payment) => ({
      id: payment.id,
      applicant: {
        id: payment.applicantId,
        name: `${payment.applicant.user.firstName} ${payment.applicant.user.lastName}`,
        email: payment.applicant.user.email,
      },
      event: payment.event,
      type: payment.type,
      amount: payment.amount,
      status: payment.status,
      createdAt: payment.createdAt,
      deletedAt: payment.deletedAt,
    })),
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      perPage: limit,
    },
  });
}

export async function POST(request: Request) {
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

  let body: ReturnType<typeof adminPaymentCreateSchema.parse>;
  try {
    body = adminPaymentCreateSchema.parse(await request.json());
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400, [
      { message: (error as Error).message },
    ]);
  }

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  // Validate foreign key references before creating payment
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

  if (body.eventId) {
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

  const payment = await db.payment.create({
    data: {
      applicantId: body.applicantId,
      eventId: body.eventId ?? null,
      type: body.type,
      amount: body.amount,
      status: body.status,
      stripePaymentId: body.stripePaymentId ?? null,
      stripeInvoiceId: body.stripeInvoiceId ?? null,
    },
  });

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "MANUAL_ADJUSTMENT",
      targetId: payment.id,
      targetType: "payment",
      description: "Created payment",
    },
  });

  return successResponse({ payment });
}
