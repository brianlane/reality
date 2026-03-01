import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { adminEventUpdateSchema } from "@/lib/validations";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
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

  const includeDeleted =
    new URL(request.url).searchParams.get("includeDeleted") === "true";

  const event = await db.event.findFirst({
    where: { id, ...(includeDeleted ? {} : { deletedAt: null }) },
    include: {
      invitations: { include: { applicant: { include: { user: true } } } },
      matches: {
        where: { deletedAt: null },
        include: {
          applicant: { include: { user: { select: { firstName: true, lastName: true } } } },
          partner: { include: { user: { select: { firstName: true, lastName: true } } } },
        },
        orderBy: { compatibilityScore: "desc" },
      },
    },
  });

  if (!event) {
    return errorResponse("NOT_FOUND", "Event not found", 404);
  }

  const genderBalance = event.invitations.reduce(
    (acc, invite) => {
      if (invite.applicant.gender === "MAN") acc.male += 1;
      if (invite.applicant.gender === "WOMAN") acc.female += 1;
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
      venueCost: event.venueCost,
      cateringCost: event.cateringCost,
      materialsCost: event.materialsCost,
      totalCost: event.totalCost,
      notes: event.notes,
      deletedAt: event.deletedAt,
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
      applicantName: `${match.applicant.user.firstName} ${match.applicant.user.lastName}`,
      partnerId: match.partnerId,
      partnerName: `${match.partner.user.firstName} ${match.partner.user.lastName}`,
      type: match.type,
      compatibilityScore: match.compatibilityScore,
      notifiedAt: match.notifiedAt,
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

export async function PATCH(request: Request, { params }: RouteContext) {
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

  let body: ReturnType<typeof adminEventUpdateSchema.parse>;
  try {
    body = adminEventUpdateSchema.parse(await request.json());
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400, [
      { message: (error as Error).message },
    ]);
  }

  const existing = await db.event.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("NOT_FOUND", "Event not found", 404);
  }

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  const event = await db.event.update({
    where: { id },
    data: {
      name: body.name,
      date: body.date ? new Date(body.date) : undefined,
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : undefined,
      venue: body.venue,
      venueAddress: body.venueAddress,
      capacity: body.capacity,
      venueCost: body.costs?.venue,
      cateringCost: body.costs?.catering,
      materialsCost: body.costs?.materials,
      totalCost: body.costs?.total,
      expectedRevenue: body.expectedRevenue,
      status: body.status,
      notes: body.notes,
    },
  });

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "MANUAL_ADJUSTMENT",
      targetId: event.id,
      targetType: "event",
      description: "Updated event",
      metadata: body ?? {},
    },
  });

  return successResponse({
    event: {
      id: event.id,
      status: event.status,
      updatedAt: event.updatedAt,
    },
  });
}

export async function DELETE(_: Request, { params }: RouteContext) {
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

  const existing = await db.event.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("NOT_FOUND", "Event not found", 404);
  }

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  const event = await db.event.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy: adminUser.id,
    },
  });

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "MANUAL_ADJUSTMENT",
      targetId: event.id,
      targetType: "event",
      description: "Soft deleted event",
    },
  });

  return successResponse({
    event: {
      id: event.id,
      deletedAt: event.deletedAt,
    },
  });
}
