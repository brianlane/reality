import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";
import { sendMatchNotificationEmail } from "@/lib/email/matches";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
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

  const event = await db.event.findFirst({
    where: { id, deletedAt: null },
  });
  if (!event) {
    return errorResponse("NOT_FOUND", "Event not found", 404);
  }

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  // Find all unnotified matches for this event
  const unnotifiedMatches = await db.match.findMany({
    where: {
      eventId: id,
      notifiedAt: null,
      deletedAt: null,
    },
    include: {
      applicant: { include: { user: true } },
      partner: { include: { user: true } },
    },
  });

  if (unnotifiedMatches.length === 0) {
    return successResponse({
      notified: 0,
      skipped: 0,
      message: "No unnotified matches found",
    });
  }

  // Build a set of applicant IDs who actually attended the event
  const attendedInvitations = await db.eventInvitation.findMany({
    where: { eventId: id, status: "ATTENDED" },
    select: { applicantId: true },
  });
  const attendedIds = new Set(
    attendedInvitations.map((inv) => inv.applicantId),
  );

  // Only notify matches where both participants attended
  const eligible = unnotifiedMatches.filter(
    (m) => attendedIds.has(m.applicantId) && attendedIds.has(m.partnerId),
  );
  const skippedCount = unnotifiedMatches.length - eligible.length;

  if (eligible.length === 0) {
    return successResponse({
      notified: 0,
      skipped: skippedCount,
      message:
        "No matches with both attendees present — check attendance status",
    });
  }

  let notifiedCount = 0;
  let failedCount = 0;

  for (const match of eligible) {
    // Email applicant about their partner
    try {
      await sendMatchNotificationEmail({
        to: match.applicant.user.email,
        firstName: match.applicant.user.firstName,
        partnerFirstName: match.partner.user.firstName,
        eventName: event.name,
        compatibilityScore: match.compatibilityScore,
        applicantId: match.applicantId,
      });
      notifiedCount++;
    } catch {
      console.error(
        `Failed to notify applicant ${match.applicantId} for match ${match.id}`,
      );
      failedCount++;
    }

    // Email partner
    try {
      await sendMatchNotificationEmail({
        to: match.partner.user.email,
        firstName: match.partner.user.firstName,
        partnerFirstName: match.applicant.user.firstName,
        eventName: event.name,
        compatibilityScore: match.compatibilityScore,
        applicantId: match.partnerId,
      });
      notifiedCount++;
    } catch {
      console.error(
        `Failed to notify partner ${match.partnerId} for match ${match.id}`,
      );
      failedCount++;
    }
  }

  // Mark only eligible matches as notified; leave non-attendee matches untouched
  const eligibleIds = eligible.map((m) => m.id);
  await db.match.updateMany({
    where: { id: { in: eligibleIds } },
    data: { notifiedAt: new Date() },
  });

  // Record admin action
  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "NOTIFY_MATCHES",
      targetId: id,
      targetType: "event",
      description: `Notified participants for ${eligible.length} match${eligible.length !== 1 ? "es" : ""}`,
      metadata: {
        matchCount: unnotifiedMatches.length,
        eligible: eligible.length,
        skipped: skippedCount,
        notified: notifiedCount,
        failed: failedCount,
      },
    },
  });

  return successResponse({
    notified: notifiedCount,
    failed: failedCount,
    matchesNotified: eligible.length,
    skipped: skippedCount,
  });
}
