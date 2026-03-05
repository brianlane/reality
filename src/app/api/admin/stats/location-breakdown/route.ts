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
    // This aligns with the new flow: event city -> generate matches -> invite.
    const matches = await db.match.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        event: { select: { location: true } },
      },
    });
    const locationMatchIds: Record<string, Set<string>> = {};
    for (const m of matches) {
      const loc = m.event.location ?? "Unknown";
      if (!locationMatchIds[loc]) locationMatchIds[loc] = new Set();
      locationMatchIds[loc].add(m.id);
    }
    breakdown = Object.entries(locationMatchIds)
      .map(([location, ids]) => ({ location, count: ids.size }))
      .sort((a, b) => b.count - a.count);
  }

  return successResponse({ breakdown });
}
