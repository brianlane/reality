import { unstable_cache } from "next/cache";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

const getMatchAnalytics = unstable_cache(
  async () => {
    const [matchTotal, typeCounts, outcomeCounts] = await Promise.all([
      db.match.count({ where: { deletedAt: null } }),
      db.match.groupBy({
        by: ["type"],
        _count: true,
        _avg: { compatibilityScore: true },
        where: { deletedAt: null },
      }),
      db.match.groupBy({
        by: ["outcome"],
        _count: true,
        where: { deletedAt: null },
      }),
    ]);

    return {
      overall: {
        totalMatches: matchTotal,
        avgMatchesPerEvent: 0,
        avgMatchesPerParticipant: 0,
      },
      byType: typeCounts.reduce<
        Record<string, { count: number; avgCompatibilityScore: number | null }>
      >((acc, row) => {
        acc[row.type] = {
          count: row._count,
          avgCompatibilityScore: row._avg.compatibilityScore ?? null,
        };
        return acc;
      }, {}),
      outcomes: {
        distribution: outcomeCounts.reduce<Record<string, number>>(
          (acc, row) => {
            acc[row.outcome] = row._count;
            return acc;
          },
          {},
        ),
        conversionFunnel: {
          matches: matchTotal,
          firstDateScheduled:
            outcomeCounts.find((row) => row.outcome === "FIRST_DATE_SCHEDULED")
              ?._count ?? 0,
          secondDate:
            outcomeCounts.find((row) => row.outcome === "SECOND_DATE")
              ?._count ?? 0,
          relationship:
            outcomeCounts.find((row) => row.outcome === "RELATIONSHIP")
              ?._count ?? 0,
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
    };
  },
  ["admin-analytics-matches"],
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

  const data = await getMatchAnalytics();

  return successResponse(data);
}
