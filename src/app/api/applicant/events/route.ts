import { getAuthUser, isAdminEmail } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getApplicantByEmail } from "@/lib/applicant-helpers";

export async function GET(request: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  if (isAdminEmail(auth.email)) {
    return errorResponse("FORBIDDEN", "Applicant access required", 403);
  }

  if (!auth.email) {
    return errorResponse("UNAUTHORIZED", "Email not available", 401);
  }

  const applicant = await getApplicantByEmail(auth.email);

  if (!applicant) {
    return errorResponse("UNAUTHORIZED", "Applicant not found", 401);
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const now = new Date();

  const invitations = await db.eventInvitation.findMany({
    where: {
      applicantId: applicant.id,
      ...(status === "UPCOMING" && { event: { date: { gte: now } } }),
      ...(status === "PAST" && { event: { date: { lt: now } } }),
    },
    include: { event: true },
    orderBy: { invitedAt: "desc" },
  });

  return successResponse({
    events: invitations.map((invite) => ({
      id: invite.event.id,
      name: invite.event.name,
      date: invite.event.date,
      startTime: invite.event.startTime,
      endTime: invite.event.endTime,
      venue: invite.event.venue,
      venueAddress: invite.event.venueAddress,
      capacity: invite.event.capacity,
      invitationStatus: invite.status,
      invitedAt: invite.invitedAt,
    })),
  });
}
