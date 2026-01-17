import { getMockAuth, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  const { id } = await params;
  const auth = await getMockAuth();
  try {
    requireAdmin(auth.role);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const event = await db.event.findUnique({
    where: { id },
    include: {
      invitations: { include: { applicant: true } },
      matches: true,
    },
  });

  if (!event) {
    return errorResponse("NOT_FOUND", "Event not found", 404);
  }

  const attendance = {
    capacity: event.capacity,
    invited: event.invitations.length,
    accepted: event.invitations.filter((invite) => invite.status === "ACCEPTED")
      .length,
    declined: event.invitations.filter((invite) => invite.status === "DECLINED")
      .length,
    attended: event.invitations.filter((invite) => invite.status === "ATTENDED")
      .length,
    noShows: event.invitations.filter((invite) => invite.status === "NO_SHOW")
      .length,
    attendanceRate:
      event.invitations.length > 0
        ? (event.invitations.filter((invite) => invite.status === "ATTENDED")
            .length /
            event.invitations.length) *
          100
        : 0,
  };

  const matchesByType = event.matches.reduce<Record<string, number>>(
    (acc, match) => {
      acc[match.type] = (acc[match.type] ?? 0) + 1;
      return acc;
    },
    {},
  );

  return successResponse({
    event: {
      id: event.id,
      name: event.name,
      date: event.date,
    },
    attendance,
    matches: {
      created: event.matches.length,
      byType: matchesByType,
      contactExchanged: event.matches.filter((match) => match.contactExchanged)
        .length,
      contactExchangeRate:
        event.matches.length > 0
          ? (event.matches.filter((match) => match.contactExchanged).length /
              event.matches.length) *
            100
          : 0,
    },
    outcomes: {
      firstDatesScheduled: event.matches.filter(
        (match) => match.outcome === "FIRST_DATE_SCHEDULED",
      ).length,
      relationships: event.matches.filter(
        (match) => match.outcome === "RELATIONSHIP",
      ).length,
      noConnection: event.matches.filter(
        (match) => match.outcome === "NO_CONNECTION",
      ).length,
      pending: event.matches.filter((match) => match.outcome === "PENDING")
        .length,
    },
    financials: {
      expectedRevenue: event.expectedRevenue,
      actualRevenue: event.actualRevenue,
      totalCost: event.totalCost,
      profit: event.actualRevenue - event.totalCost,
      profitMargin:
        event.actualRevenue > 0
          ? ((event.actualRevenue - event.totalCost) / event.actualRevenue) *
            100
          : 0,
    },
    demographics: {
      avgAge:
        event.invitations.length > 0
          ? event.invitations.reduce(
              (sum, invite) => sum + invite.applicant.age,
              0,
            ) / event.invitations.length
          : 0,
      ageDistribution: {},
      occupations: [],
    },
  });
}
