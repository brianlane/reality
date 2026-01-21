import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { adminEventCreateSchema } from "@/lib/validations";
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
  const status = url.searchParams.get("status");
  const fromDate = url.searchParams.get("fromDate");
  const toDate = url.searchParams.get("toDate");
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const includeDeleted = url.searchParams.get("includeDeleted") === "true";

  // Validate pagination parameters
  if (!Number.isInteger(page) || page < 1) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Page must be a positive integer",
      400,
    );
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Limit must be a positive integer between 1 and 100",
      400,
    );
  }

  const where = {
    ...(status ? { status: status as never } : {}),
    ...(fromDate || toDate
      ? {
          date: {
            ...(fromDate ? { gte: new Date(fromDate) } : {}),
            ...(toDate ? { lte: new Date(toDate) } : {}),
          },
        }
      : {}),
    ...(includeDeleted ? {} : { deletedAt: null }),
  };

  const [events, total] = await Promise.all([
    db.event.findMany({
      where,
      include: {
        invitations: true,
        payments: true,
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.event.count({ where }),
  ]);

  return successResponse({
    events: events.map((event) => ({
      id: event.id,
      name: event.name,
      date: event.date,
      status: event.status,
      capacity: event.capacity,
      invitationsSent: event.invitations.length,
      confirmed: event.invitations.filter(
        (invite) => invite.status === "ACCEPTED",
      ).length,
      expectedRevenue: event.expectedRevenue,
      actualRevenue: event.actualRevenue,
      totalCost: event.totalCost,
      projectedProfit: event.expectedRevenue - event.totalCost,
      deletedAt: event.deletedAt,
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

  let body: ReturnType<typeof adminEventCreateSchema.parse>;
  try {
    body = adminEventCreateSchema.parse(await request.json());
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400, [
      { message: (error as Error).message },
    ]);
  }

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  const event = await db.event.create({
    data: {
      name: body.name,
      date: new Date(body.date),
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      venue: body.venue,
      venueAddress: body.venueAddress,
      capacity: body.capacity,
      venueCost: body.costs.venue,
      cateringCost: body.costs.catering,
      materialsCost: body.costs.materials,
      totalCost: body.costs.total,
      expectedRevenue: body.expectedRevenue,
      status: body.status ?? "DRAFT",
      notes: body.notes,
      createdBy: adminUser.id,
    },
  });

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "CREATE_EVENT",
      targetId: event.id,
      targetType: "event",
      description: "Created event",
    },
  });

  return successResponse({ event });
}
