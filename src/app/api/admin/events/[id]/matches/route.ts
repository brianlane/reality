import { getMockAuth, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";
import { createMatchesSchema } from "@/lib/validations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const auth = await getMockAuth();
  try {
    requireAdmin(auth.role);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  let body: {
    matches: Array<{
      applicantId: string;
      partnerId: string;
      compatibilityScore?: number;
    }>;
  };
  try {
    body = createMatchesSchema.parse(await request.json());
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400, [
      { message: (error as Error).message },
    ]);
  }
  const adminUser = await getOrCreateAdminUser(auth.userId);

  const event = await db.event.findUnique({ where: { id } });
  if (!event) {
    return errorResponse("NOT_FOUND", "Event not found", 404);
  }

  const created = await Promise.all(
    body.matches.map((match) =>
      db.match.upsert({
        where: {
          eventId_applicantId_partnerId: {
            eventId: id,
            applicantId: match.applicantId,
            partnerId: match.partnerId,
          },
        },
        update: { compatibilityScore: match.compatibilityScore },
        create: {
          eventId: id,
          applicantId: match.applicantId,
          partnerId: match.partnerId,
          type: "CURATED",
          compatibilityScore: match.compatibilityScore,
        },
      }),
    ),
  );

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "RECORD_MATCH",
      targetId: id,
      targetType: "event",
      description: "Created curated matches",
      metadata: { count: created.length },
    },
  });

  return successResponse({
    matches: created.map((match) => ({
      id: match.id,
      applicantId: match.applicantId,
      partnerId: match.partnerId,
      type: match.type,
      compatibilityScore: match.compatibilityScore,
      createdAt: match.createdAt,
    })),
    stats: {
      totalMatches: created.length,
      avgMatchesPerParticipant:
        created.length > 0
          ? created.length /
            (new Set(body.matches.map((m) => m.applicantId)).size || 1)
          : 0,
    },
  });
}
