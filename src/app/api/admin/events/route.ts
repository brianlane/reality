import { getMockAuth, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function GET(request: Request) {
  const auth = await getMockAuth();
  try {
    requireAdmin(auth.role);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const fromDate = url.searchParams.get("fromDate");
  const toDate = url.searchParams.get("toDate");

  const events = await db.event.findMany({
    where: {
      ...(status ? { status: status as never } : {}),
      ...(fromDate || toDate
        ? {
            date: {
              ...(fromDate ? { gte: new Date(fromDate) } : {}),
              ...(toDate ? { lte: new Date(toDate) } : {}),
            },
          }
        : {}),
    },
    include: {
      invitations: true,
      payments: true,
    },
    orderBy: { date: "desc" },
  });

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
    })),
  });
}
