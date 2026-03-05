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

  const applicationsExcludedStatuses: ApplicationStatus[] = [
    "WAITLIST",
    "WAITLIST_INVITED",
    "RESEARCH_INVITED",
    "RESEARCH_IN_PROGRESS",
    "RESEARCH_COMPLETED",
  ];

  if (type === "applications") {
    const rows = await db.applicant.groupBy({
      by: ["location"],
      _count: true,
      where: {
        deletedAt: null,
        applicationStatus: { notIn: applicationsExcludedStatuses },
      },
    });
    breakdown = rows
      .map((r) => ({ location: r.location, count: r._count }))
      .sort((a, b) => b.count - a.count);
  } else if (type === "users") {
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
    // Events are location-based, so match counts are grouped by event location.
    // Use two aggregation queries instead of loading all match records into memory.
    const matchCountsByEvent = await db.match.groupBy({
      by: ["eventId"],
      _count: true,
      where: { deletedAt: null },
    });
    const eventIds = matchCountsByEvent.map((r) => r.eventId);
    const events = await db.event.findMany({
      where: { id: { in: eventIds } },
      select: { id: true, location: true },
    });
    const locationById = new Map(events.map((e) => [e.id, e.location]));
    const locationCounts = new Map<string, number>();
    for (const row of matchCountsByEvent) {
      const label = locationById.get(row.eventId) ?? "Unknown";
      locationCounts.set(label, (locationCounts.get(label) ?? 0) + row._count);
    }
    breakdown = [...locationCounts.entries()]
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);
  }

  return successResponse({ breakdown });
}
