import { getMockAuth, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";

type Params = {
  params: { id: string };
};

type CompleteBody = {
  actualRevenue?: number;
  actualCost?: number;
  attendance?: { attended?: number; noShows?: number };
  notes?: string;
};

export async function POST(request: Request, { params }: Params) {
  const auth = await getMockAuth();
  try {
    requireAdmin(auth.role);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const body = (await request.json()) as CompleteBody;
  const adminUser = await getOrCreateAdminUser(auth.userId);

  const event = await db.event.update({
    where: { id: params.id },
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
