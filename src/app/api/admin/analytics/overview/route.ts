import { getMockAuth, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function GET() {
  const auth = await getMockAuth();
  try {
    requireAdmin(auth.role);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const [applicantTotal, applicantStatusCounts, genderCounts, compatibilityAvg] =
    await Promise.all([
      db.applicant.count(),
      db.applicant.groupBy({ by: ["applicationStatus"], _count: true }),
      db.applicant.groupBy({ by: ["gender"], _count: true }),
      db.applicant.aggregate({ _avg: { compatibilityScore: true } }),
    ]);

  const statusMap = applicantStatusCounts.reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.applicationStatus] = row._count;
      return acc;
    },
    {},
  );

  const genderMap = genderCounts.reduce<Record<string, number>>((acc, row) => {
    acc[row.gender] = row._count;
    return acc;
  }, {});

  const eventsTotal = await db.event.count();
  const upcomingEvents = await db.event.count({
    where: { date: { gte: new Date() } },
  });
  const completedEvents = await db.event.count({
    where: { status: "COMPLETED" },
  });

  const matchTotal = await db.match.count();
  const matchTypeCounts = await db.match.groupBy({ by: ["type"], _count: true });
  const matchOutcomeCounts = await db.match.groupBy({
    by: ["outcome"],
    _count: true,
  });

  const revenue = await db.payment.aggregate({
    _sum: { amount: true },
  });
  const revenueByType = await db.payment.groupBy({
    by: ["type"],
    _sum: { amount: true },
  });

  return successResponse({
    applicants: {
      total: applicantTotal,
      pending: statusMap.SCREENING_IN_PROGRESS ?? 0,
      approved: statusMap.APPROVED ?? 0,
      rejected: statusMap.REJECTED ?? 0,
      waitlist: statusMap.WAITLIST ?? 0,
      approvalRate:
        applicantTotal > 0
          ? ((statusMap.APPROVED ?? 0) / applicantTotal) * 100
          : 0,
      genderBalance: {
        male: genderMap.MALE ?? 0,
        female: genderMap.FEMALE ?? 0,
        other: (genderMap.NON_BINARY ?? 0) + (genderMap.PREFER_NOT_TO_SAY ?? 0),
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
      outcomes: matchOutcomeCounts.reduce<Record<string, number>>((acc, row) => {
        acc[row.outcome] = row._count;
        return acc;
      }, {}),
      successRate: matchTotal > 0 ? 0 : 0,
    },
    revenue: {
      total: revenue._sum.amount ?? 0,
      byType: revenueByType.reduce<Record<string, number>>((acc, row) => {
        acc[row.type] = row._sum.amount ?? 0;
        return acc;
      }, {}),
      ytd: revenue._sum.amount ?? 0,
      avgPerEvent: eventsTotal > 0 ? (revenue._sum.amount ?? 0) / eventsTotal : 0,
    },
    trends: {
      applicationsPerWeek: [],
      matchSuccessRate: [],
    },
  });
}
