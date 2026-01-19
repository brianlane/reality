import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  const { id } = await params;
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const event = await db.event.findUnique({
    where: { id },
    include: {
      invitations: { include: { applicant: { include: { user: true } } } },
      matches: true,
    },
  });

  if (!event) {
    return errorResponse("NOT_FOUND", "Event not found", 404);
  }

  const genderBalance = event.invitations.reduce(
    (acc, invite) => {
      if (invite.applicant.gender === "MALE") acc.male += 1;
      if (invite.applicant.gender === "FEMALE") acc.female += 1;
      return acc;
    },
    { male: 0, female: 0 },
  );

  return successResponse({
    event: {
      id: event.id,
      name: event.name,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      venue: event.venue,
      venueAddress: event.venueAddress,
      capacity: event.capacity,
      status: event.status,
      expectedRevenue: event.expectedRevenue,
      actualRevenue: event.actualRevenue,
      totalCost: event.totalCost,
      notes: event.notes,
    },
    invitations: event.invitations.map((invite) => ({
      id: invite.id,
      applicantId: invite.applicantId,
      applicantName: `${invite.applicant.user.firstName} ${invite.applicant.user.lastName}`,
      status: invite.status,
      invitedAt: invite.invitedAt,
      respondedAt: invite.respondedAt,
    })),
    matches: event.matches.map((match) => ({
      id: match.id,
      applicantId: match.applicantId,
      partnerId: match.partnerId,
      type: match.type,
      compatibilityScore: match.compatibilityScore,
    })),
    stats: {
      invitationsSent: event.invitations.length,
      accepted: event.invitations.filter(
        (invite) => invite.status === "ACCEPTED",
      ).length,
      declined: event.invitations.filter(
        (invite) => invite.status === "DECLINED",
      ).length,
      pending: event.invitations.filter((invite) => invite.status === "PENDING")
        .length,
      attended: event.invitations.filter(
        (invite) => invite.status === "ATTENDED",
      ).length,
      noShows: event.invitations.filter((invite) => invite.status === "NO_SHOW")
        .length,
      genderBalance,
    },
  });
}
