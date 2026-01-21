import { unstable_cache } from "next/cache";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

const getEventAnalytics = unstable_cache(
  async () => {
    const events = await db.event.findMany({
      where: { deletedAt: null },
      include: { invitations: true },
    });

    const totals = events.reduce(
      (acc, event) => {
        acc.expectedRevenue += event.expectedRevenue;
        acc.actualRevenue += event.actualRevenue;
        acc.totalCost += event.totalCost;
        acc.capacity += event.capacity;
        return acc;
      },
      {
        expectedRevenue: 0,
        actualRevenue: 0,
        totalCost: 0,
        capacity: 0,
      },
    );

    let attendanceRateSum = 0;
    let noShowRateSum = 0;
    let attendanceSamples = 0;

    events.forEach((event) => {
      const invited = event.invitations.length;
      if (invited > 0) {
        const attended = event.invitations.filter(
          (invite) => invite.status === "ATTENDED",
        ).length;
        const noShows = event.invitations.filter(
          (invite) => invite.status === "NO_SHOW",
        ).length;
        attendanceRateSum += attended / invited;
        noShowRateSum += noShows / invited;
        attendanceSamples += 1;
      }
    });

    const now = new Date();

    return {
      totals: {
        events: events.length,
        upcoming: events.filter((event) => event.date >= now).length,
        completed: events.filter((event) => event.status === "COMPLETED")
          .length,
        cancelled: events.filter((event) => event.status === "CANCELLED")
          .length,
      },
      attendance: {
        avgAttendanceRate:
          attendanceSamples > 0
            ? (attendanceRateSum / attendanceSamples) * 100
            : 0,
        avgNoShowRate:
          attendanceSamples > 0 ? (noShowRateSum / attendanceSamples) * 100 : 0,
      },
      financials: {
        expectedRevenue: totals.expectedRevenue,
        actualRevenue: totals.actualRevenue,
        totalCost: totals.totalCost,
        profit: totals.actualRevenue - totals.totalCost,
      },
      capacity: {
        totalCapacity: totals.capacity,
        avgCapacity: events.length > 0 ? totals.capacity / events.length : 0,
      },
    };
  },
  ["admin-analytics-events"],
  { revalidate: 60 },
);

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const data = await getEventAnalytics();
  return successResponse(data);
}
