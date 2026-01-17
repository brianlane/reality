import { getMockAuth, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";

type Params = {
  params: { id: string };
};

type InviteBody = {
  applicantIds: string[];
};

export async function POST(request: Request, { params }: Params) {
  const auth = await getMockAuth();
  try {
    requireAdmin(auth.role);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const body = (await request.json()) as InviteBody;
  const adminUser = await getOrCreateAdminUser(auth.userId);

  const invitations = await Promise.all(
    body.applicantIds.map((applicantId) =>
      db.eventInvitation.upsert({
        where: { eventId_applicantId: { eventId: params.id, applicantId } },
        update: {},
        create: { eventId: params.id, applicantId },
      }),
    ),
  );

  await db.event.update({
    where: { id: params.id },
    data: { status: "INVITATIONS_SENT" },
  });

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "SEND_INVITATIONS",
      targetId: params.id,
      targetType: "event",
      description: "Sent event invitations",
      metadata: { count: invitations.length },
    },
  });

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
