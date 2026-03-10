import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";
import { inviteApplicantsSchema } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { sendEventInvitationEmail } from "@/lib/email/events";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  if (!auth.email) {
    return errorResponse("UNAUTHORIZED", "Email not available", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  let body: { applicantIds: string[] };
  try {
    body = inviteApplicantsSchema.parse(await request.json());
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400, [
      { message: (error as Error).message },
    ]);
  }
  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  const event = await db.event.findFirst({
    where: { id, deletedAt: null },
  });
  if (!event) {
    return errorResponse("NOT_FOUND", "Event not found", 404);
  }

  // Enforce flow: matches must be generated before invitations can be sent.
  // If CURATED matches exist, only cohort members may be invited.
  const cohortMatches = await db.match.findMany({
    where: { eventId: id, type: "CURATED", deletedAt: null },
    select: { applicantId: true, partnerId: true },
  });

  if (cohortMatches.length === 0) {
    return errorResponse(
      "VALIDATION_ERROR",
      "No matches have been generated for this event. Generate matches first before inviting applicants.",
      400,
    );
  }

  const cohortIds = new Set(
    cohortMatches.flatMap((m) => [m.applicantId, m.partnerId]),
  );
  const outsideCohort = body.applicantIds.filter((aid) => !cohortIds.has(aid));
  if (outsideCohort.length > 0) {
    return errorResponse(
      "VALIDATION_ERROR",
      `${outsideCohort.length} applicant(s) are not in the match cohort for this event. Only applicants who appear in a generated match may be invited.`,
      400,
    );
  }

  const invitations = await Promise.all(
    body.applicantIds.map((applicantId) =>
      db.eventInvitation.upsert({
        where: { eventId_applicantId: { eventId: id, applicantId } },
        update: {},
        create: { eventId: id, applicantId },
      }),
    ),
  );

  await db.event.update({
    where: { id },
    data: { status: "INVITATIONS_SENT" },
  });

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "SEND_INVITATIONS",
      targetId: id,
      targetType: "event",
      description: "Sent event invitations",
      metadata: { count: invitations.length },
    },
  });

  // Send invitation emails
  const applicants = await db.applicant.findMany({
    where: {
      id: { in: body.applicantIds },
      deletedAt: null,
    },
    select: {
      id: true,
      user: {
        select: {
          email: true,
          firstName: true,
        },
      },
    },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  for (const applicant of applicants) {
    try {
      await sendEventInvitationEmail({
        to: applicant.user.email,
        firstName: applicant.user.firstName,
        eventTitle: event.name,
        eventDate: event.date,
        eventLocation: event.venue,
        eventAddress: event.venueAddress,
        startTime: event.startTime,
        endTime: event.endTime,
        rsvpUrl: `${appUrl}/events/${event.id}/rsvp`,
        applicantId: applicant.id,
      });
    } catch (emailError) {
      logger.error("Failed to send event invitation email", {
        email: applicant.user.email,
        error:
          emailError instanceof Error ? emailError.message : String(emailError),
      });
      // Continue sending to other applicants even if one fails
    }
  }

  return successResponse({
    invitations: invitations.map((invite) => ({
      id: invite.id,
      applicantId: invite.applicantId,
      eventId: invite.eventId,
      status: invite.status,
      invitedAt: invite.invitedAt,
    })),
    stats: {
      sent: invitations.length,
    },
  });
}
