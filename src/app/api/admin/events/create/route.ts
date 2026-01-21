import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";
import { adminEventCreateSchema } from "@/lib/validations";

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
