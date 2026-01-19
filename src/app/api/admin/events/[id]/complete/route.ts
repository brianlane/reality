import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CompleteBody = {
  actualRevenue?: number;
  actualCost?: number;
  attendance?: { attended?: number; noShows?: number };
  notes?: string;
};

export async function POST(request: Request, { params }: RouteContext) {
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

  const body = (await request.json()) as CompleteBody;
  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  const existing = await db.event.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("NOT_FOUND", "Event not found", 404);
  }

  const event = await db.event.update({
    where: { id },
    data: {
      status: "COMPLETED",
      actualRevenue: body.actualRevenue ?? 0,
      totalCost: body.actualCost ?? 0,
      notes: body.notes,
    },
  });

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "MANUAL_ADJUSTMENT",
      targetId: event.id,
      targetType: "event",
      description: "Completed event",
      metadata: body,
    },
  });

  return successResponse({
    event: {
      id: event.id,
      status: event.status,
      actualRevenue: event.actualRevenue,
      actualProfit: event.actualRevenue - event.totalCost,
      updatedAt: event.updatedAt,
    },
  });
}
