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

  const [matchTotal, typeCounts, outcomeCounts] = await Promise.all([
    db.match.count(),
    db.match.groupBy({ by: ["type"], _count: true, _avg: { compatibilityScore: true } }),
    db.match.groupBy({ by: ["outcome"], _count: true }),
  ]);

  return successResponse({
    overall: {
      totalMatches: matchTotal,
      avgMatchesPerEvent: 0,
      avgMatchesPerParticipant: 0,
    },
    byType: typeCounts.reduce<Record<string, { count: number; avgCompatibilityScore: number | null }>>(
      (acc, row) => {
        acc[row.type] = {
          count: row._count,
          avgCompatibilityScore: row._avg.compatibilityScore ?? null,
        };
        return acc;
      },
      {},
    ),
    outcomes: {
      distribution: outcomeCounts.reduce<Record<string, number>>((acc, row) => {
        acc[row.outcome] = row._count;
        return acc;
      }, {}),
      conversionFunnel: {
        matches: matchTotal,
        firstDateScheduled: outcomeCounts.find((row) => row.outcome === "FIRST_DATE_SCHEDULED")
          ?._count ?? 0,
        secondDate: outcomeCounts.find((row) => row.outcome === "SECOND_DATE")?._count ?? 0,
        relationship: outcomeCounts.find((row) => row.outcome === "RELATIONSHIP")?._count ?? 0,
      },
    },
    timing: {
      avgDaysToFirstDate: 0,
      avgDaysToRelationship: 0,
    },
    compatibility: {
      scoreBuckets: {},
      correlation: 0,
    },
  });
}
