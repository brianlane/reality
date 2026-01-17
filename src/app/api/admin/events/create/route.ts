import { getMockAuth, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";

export async function POST(request: Request) {
  const auth = await getMockAuth();
  try {
    requireAdmin(auth.role);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const body = await request.json();
  const adminUser = await getOrCreateAdminUser(auth.userId);

  const event = await db.event.create({
    data: {
      name: body.name,
      date: new Date(body.date),
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      venue: body.venue,
      venueAddress: body.venueAddress,
      capacity: body.capacity ?? 20,
      venueCost: body.costs?.venue ?? 0,
      cateringCost: body.costs?.catering ?? 0,
      materialsCost: body.costs?.materials ?? 0,
      totalCost: body.costs?.total ?? 0,
      expectedRevenue: body.expectedRevenue ?? 0,
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
