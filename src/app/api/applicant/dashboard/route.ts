import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getApplicantByClerkId } from "@/lib/applicant-helpers";

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }

  const applicant = await getApplicantByClerkId(auth.userId);

  if (!applicant) {
    return errorResponse("UNAUTHORIZED", "Applicant not found", 401);
  }

  const invitations = await db.eventInvitation.findMany({
    where: { applicantId: applicant.id },
    include: { event: true },
    orderBy: { invitedAt: "desc" },
  });

  const matches = await db.match.findMany({
    where: { applicantId: applicant.id },
    include: { event: true, partner: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });

  const eventsAttended = invitations.filter(
    (invite) => invite.status === "ATTENDED",
  ).length;

  const datesCompleted = matches.filter((match) =>
    ["FIRST_DATE_COMPLETED", "SECOND_DATE", "DATING", "RELATIONSHIP"].includes(
      match.outcome,
    ),
  ).length;

  return successResponse({
    application: {
      id: applicant.id,
      status: applicant.applicationStatus,
      submittedAt: applicant.submittedAt,
      reviewedAt: applicant.reviewedAt,
    },
    upcomingEvents: invitations.map((invite) => ({
      id: invite.eventId,
      name: invite.event.name,
      date: invite.event.date,
      venue: invite.event.venue,
      invitationStatus: invite.status,
    })),
    matches: matches.map((match) => ({
      id: match.id,
      partnerId: match.partnerId,
      partnerFirstName: match.partner.user.firstName,
      eventName: match.event.name,
      outcome: match.outcome,
      createdAt: match.createdAt,
    })),
    stats: {
      eventsAttended,
      matchesReceived: matches.length,
      datesCompleted,
    },
  });
}
