import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { adminMatchCreateSchema } from "@/lib/validations";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";

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
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const eventId = url.searchParams.get("eventId") ?? undefined;
  const applicantId = url.searchParams.get("applicantId") ?? undefined;
  const partnerId = url.searchParams.get("partnerId") ?? undefined;
  const type = url.searchParams.get("type") ?? undefined;
  const outcome = url.searchParams.get("outcome") ?? undefined;
  const includeDeleted = url.searchParams.get("includeDeleted") === "true";

  // Validate pagination parameters
  if (!Number.isInteger(page) || page < 1) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Page must be a positive integer",
      400,
    );
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Limit must be a positive integer between 1 and 100",
      400,
    );
  }

  const where = {
    ...(eventId ? { eventId } : {}),
    ...(applicantId ? { applicantId } : {}),
    ...(partnerId ? { partnerId } : {}),
    ...(type ? { type: type as never } : {}),
    ...(outcome ? { outcome: outcome as never } : {}),
    ...(includeDeleted ? {} : { deletedAt: null }),
  };

  const [matches, total] = await Promise.all([
    db.match.findMany({
      where,
      include: {
        event: { select: { id: true, name: true, date: true } },
        applicant: { include: { user: true } },
        partner: { include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.match.count({ where }),
  ]);

  return successResponse({
    matches: matches.map((match) => ({
      id: match.id,
      event: match.event,
      applicant: {
        id: match.applicantId,
        name: `${match.applicant.user.firstName} ${match.applicant.user.lastName}`,
      },
      partner: {
        id: match.partnerId,
        name: `${match.partner.user.firstName} ${match.partner.user.lastName}`,
      },
      type: match.type,
      outcome: match.outcome,
      compatibilityScore: match.compatibilityScore,
      contactExchanged: match.contactExchanged,
      createdAt: match.createdAt,
      deletedAt: match.deletedAt,
    })),
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      perPage: limit,
    },
  });
}

export async function POST(request: Request) {
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

  let body: ReturnType<typeof adminMatchCreateSchema.parse>;
  try {
    body = adminMatchCreateSchema.parse(await request.json());
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400, [
      { message: (error as Error).message },
    ]);
  }

  const [event, applicants] = await Promise.all([
    db.event.findFirst({
      where: { id: body.eventId, deletedAt: null },
      select: { id: true },
    }),
    db.applicant.findMany({
      where: {
        id: { in: [body.applicantId, body.partnerId] },
        deletedAt: null,
      },
      select: { id: true },
    }),
  ]);

  if (!event) {
    return errorResponse("NOT_FOUND", "Event not found", 404);
  }

  if (applicants.length !== 2) {
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  const match = await db.match.upsert({
    where: {
      eventId_applicantId_partnerId: {
        eventId: body.eventId,
        applicantId: body.applicantId,
        partnerId: body.partnerId,
      },
    },
    update: {
      type: body.type,
      compatibilityScore: body.compatibilityScore,
      deletedAt: null,
      deletedBy: null,
    },
    create: {
      eventId: body.eventId,
      applicantId: body.applicantId,
      partnerId: body.partnerId,
      type: body.type,
      compatibilityScore: body.compatibilityScore,
    },
  });

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "RECORD_MATCH",
      targetId: match.id,
      targetType: "match",
      description: "Created match",
    },
  });

  return successResponse({
    match: {
      id: match.id,
      type: match.type,
      compatibilityScore: match.compatibilityScore,
      createdAt: match.createdAt,
    },
  });
}
