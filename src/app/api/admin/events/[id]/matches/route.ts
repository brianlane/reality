import { getMockAuth, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type MatchInput = {
  applicantId: string;
  partnerId: string;
  compatibilityScore?: number;
};

type MatchesBody = {
  matches: MatchInput[];
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const auth = await getMockAuth();
  try {
    requireAdmin(auth.role);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const body = (await request.json()) as MatchesBody;
  const adminUser = await getOrCreateAdminUser(auth.userId);

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
