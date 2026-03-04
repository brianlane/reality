import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { ApplicationStatus } from "@prisma/client";

export type LocationBreakdownType =
  | "applications"
  | "users"
  | "waitlist"
  | "matches";

export async function GET(request: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const url = new URL(request.url);
  const type = (url.searchParams.get("type") ??
    "applications") as LocationBreakdownType;

  let breakdown: { location: string; count: number }[] = [];

  if (type === "applications" || type === "users") {
    const rows = await db.applicant.groupBy({
      by: ["location"],
      _count: true,
      where: { deletedAt: null },
    });
    breakdown = rows
      .map((r) => ({ location: r.location, count: r._count }))
      .sort((a, b) => b.count - a.count);
  } else if (type === "waitlist") {
    const rows = await db.applicant.groupBy({
      by: ["location"],
      _count: true,
      where: {
        applicationStatus: {
          in: [ApplicationStatus.WAITLIST, ApplicationStatus.WAITLIST_INVITED],
        },
        deletedAt: null,
      },
    });
    breakdown = rows
      .map((r) => ({ location: r.location, count: r._count }))
      .sort((a, b) => b.count - a.count);
  } else if (type === "matches") {
    // Group by applicant location since Match has no location field.
    // Fetch all non-deleted match applicant locations and aggregate in JS.
    const matches = await db.match.findMany({
      where: { deletedAt: null },
      select: { applicant: { select: { location: true } } },
    });
    const locationMap: Record<string, number> = {};
    for (const m of matches) {
      const loc = m.applicant.location;
      locationMap[loc] = (locationMap[loc] ?? 0) + 1;
    }
    breakdown = Object.entries(locationMap)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);
  }

  return successResponse({ breakdown });
}
