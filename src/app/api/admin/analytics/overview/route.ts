import { unstable_cache } from "next/cache";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

const getOverviewAnalytics = unstable_cache(
  async () => {
    const [
      applicantTotal,
      applicantStatusCounts,
      genderCounts,
      compatibilityAvg,
    ] = await Promise.all([
      db.applicant.count({ where: { deletedAt: null } }),
      db.applicant.groupBy({
        by: ["applicationStatus"],
        _count: true,
        where: { deletedAt: null },
      }),
      db.applicant.groupBy({
        by: ["gender"],
        _count: true,
        where: { deletedAt: null },
      }),
      db.applicant.aggregate({
        _avg: { compatibilityScore: true },
        where: { deletedAt: null },
      }),
    ]);

    const statusMap = applicantStatusCounts.reduce<Record<string, number>>(
      (acc, row) => {
        acc[row.applicationStatus] = row._count;
        return acc;
      },
      {},
    );

    const genderMap = genderCounts.reduce<Record<string, number>>(
      (acc, row) => {
        acc[row.gender] = row._count;
        return acc;
      },
      {},
    );

    const eventsTotal = await db.event.count({ where: { deletedAt: null } });
    const upcomingEvents = await db.event.count({
      where: { date: { gte: new Date() }, deletedAt: null },
    });
    const completedEvents = await db.event.count({
      where: { status: "COMPLETED", deletedAt: null },
    });

    const matchTotal = await db.match.count({ where: { deletedAt: null } });
    const matchTypeCounts = await db.match.groupBy({
      by: ["type"],
      _count: true,
      where: { deletedAt: null },
    });
    const matchOutcomeCounts = await db.match.groupBy({
      by: ["outcome"],
      _count: true,
      where: { deletedAt: null },
    });

    const revenue = await db.payment.aggregate({
      _sum: { amount: true },
      where: { deletedAt: null },
    });
    const revenueByType = await db.payment.groupBy({
      by: ["type"],
      _sum: { amount: true },
      where: { deletedAt: null },
    });

    const outcomeMap = matchOutcomeCounts.reduce<Record<string, number>>(
      (acc, row) => {
        acc[row.outcome] = row._count;
        return acc;
      },
      {},
    );

    const successOutcomes = [
      "FIRST_DATE_SCHEDULED",
      "FIRST_DATE_COMPLETED",
      "SECOND_DATE",
      "DATING",
      "RELATIONSHIP",
      "ENGAGED",
      "MARRIED",
    ];
    const successCount = successOutcomes.reduce(
      (sum, outcome) => sum + (outcomeMap[outcome] ?? 0),
      0,
    );

    return {
      applicants: {
        total: applicantTotal,
        pending: statusMap.SCREENING_IN_PROGRESS ?? 0,
        approved: statusMap.APPROVED ?? 0,
        rejected: statusMap.REJECTED ?? 0,
        waitlist: (statusMap.WAITLIST ?? 0) + (statusMap.WAITLIST_INVITED ?? 0),
        approvalRate:
          applicantTotal > 0
            ? ((statusMap.APPROVED ?? 0) / applicantTotal) * 100
            : 0,
        genderBalance: {
          male: genderMap.MALE ?? 0,
          female: genderMap.FEMALE ?? 0,
          other:
            (genderMap.NON_BINARY ?? 0) + (genderMap.PREFER_NOT_TO_SAY ?? 0),
        },
      },
      compatibility: {
        avgScore: compatibilityAvg._avg.compatibilityScore ?? 0,
        distribution: {},
      },
      events: {
        total: eventsTotal,
        upcoming: upcomingEvents,
        completed: completedEvents,
        avgAttendance: 0,
        avgNoShowRate: 0,
      },
      matches: {
        total: matchTotal,
        byType: matchTypeCounts.reduce<Record<string, number>>((acc, row) => {
          acc[row.type] = row._count;
          return acc;
        }, {}),
        outcomes: outcomeMap,
        successRate: matchTotal > 0 ? (successCount / matchTotal) * 100 : 0,
      },
      revenue: {
        total: revenue._sum.amount ?? 0,
        byType: revenueByType.reduce<Record<string, number>>((acc, row) => {
          acc[row.type] = row._sum.amount ?? 0;
          return acc;
        }, {}),
        ytd: revenue._sum.amount ?? 0,
        avgPerEvent:
          eventsTotal > 0 ? (revenue._sum.amount ?? 0) / eventsTotal : 0,
      },
      trends: {
        applicationsPerWeek: [],
        matchSuccessRate: [],
      },
    };
  },
  ["admin-analytics-overview"],
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

  const data = await getOverviewAnalytics();

  return successResponse(data);
}
