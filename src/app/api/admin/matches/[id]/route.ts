import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { adminMatchUpdateSchema } from "@/lib/validations";
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

  const match = await db.match.findFirst({
    where: { id, ...(includeDeleted ? {} : { deletedAt: null }) },
    include: {
      event: true,
      applicant: { include: { user: true } },
      partner: { include: { user: true } },
    },
  });

  if (!match) {
    return errorResponse("NOT_FOUND", "Match not found", 404);
  }

  return successResponse({
    match: {
      id: match.id,
      eventId: match.eventId,
      applicantId: match.applicantId,
      partnerId: match.partnerId,
      event: match.event,
      applicant: match.applicant,
      partner: match.partner,
      type: match.type,
      outcome: match.outcome,
      compatibilityScore: match.compatibilityScore,
      contactExchanged: match.contactExchanged,
      notes: match.notes,
      createdAt: match.createdAt,
      deletedAt: match.deletedAt,
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

  let body: ReturnType<typeof adminMatchUpdateSchema.parse>;
  try {
    body = adminMatchUpdateSchema.parse(await request.json());
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400, [
      { message: (error as Error).message },
    ]);
  }

  const existing = await db.match.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("NOT_FOUND", "Match not found", 404);
  }

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  const match = await db.match.update({
    where: { id },
    data: {
      outcome: body.outcome,
      notes: body.notes,
      contactExchanged: body.contactExchanged,
      contactExchangedAt: body.contactExchanged ? new Date() : undefined,
      compatibilityScore: body.compatibilityScore,
    },
  });

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "UPDATE_MATCH_OUTCOME",
      targetId: match.id,
      targetType: "match",
      description: "Updated match",
      metadata: body ?? {},
    },
  });

  return successResponse({
    match: {
      id: match.id,
      outcome: match.outcome,
      contactExchanged: match.contactExchanged,
      updatedAt: match.updatedAt,
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

  const existing = await db.match.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("NOT_FOUND", "Match not found", 404);
  }

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  const match = await db.match.update({
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
      targetId: match.id,
      targetType: "match",
      description: "Soft deleted match",
    },
  });

  return successResponse({
    match: {
      id: match.id,
      deletedAt: match.deletedAt,
    },
  });
}
