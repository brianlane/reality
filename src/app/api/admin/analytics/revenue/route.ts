import { unstable_cache } from "next/cache";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

const getRevenueAnalytics = unstable_cache(
  async () => {
    const [total, byType, byStatus] = await Promise.all([
      db.payment.aggregate({
        _sum: { amount: true },
        where: { deletedAt: null },
      }),
      db.payment.groupBy({
        by: ["type"],
        _sum: { amount: true },
        where: { deletedAt: null },
      }),
      db.payment.groupBy({
        by: ["status"],
        _count: true,
        _sum: { amount: true },
        where: { deletedAt: null },
      }),
    ]);

    return {
      total: total._sum.amount ?? 0,
      byType: byType.reduce<Record<string, number>>((acc, row) => {
        acc[row.type] = row._sum.amount ?? 0;
        return acc;
      }, {}),
      byStatus: byStatus.reduce<
        Record<string, { count: number; amount: number }>
      >((acc, row) => {
        acc[row.status] = {
          count: row._count,
          amount: row._sum.amount ?? 0,
        };
        return acc;
      }, {}),
    };
  },
  ["admin-analytics-revenue"],
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

  const data = await getRevenueAnalytics();
  return successResponse(data);
}
