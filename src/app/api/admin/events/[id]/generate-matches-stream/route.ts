import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  computeDistinctMatches,
  preloadAnswerCache,
  scoreAllPairs,
} from "@/lib/matching/weighted-compatibility";
import { ApplicationStatus, ScreeningStatus } from "@prisma/client";
import { z } from "zod";

const streamMatchesSchema = z.object({
  minScore: z.number().min(0).max(100).optional().default(60),
  maxPerGender: z.number().int().min(1).max(100).optional().default(50),
});

/**
 * SSE endpoint that streams match scoring progress in real time.
 * Pulls from the approved applicant pool in the event's city (not invitations).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthUser();
  if (!auth) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    requireAdmin(auth.email);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  const { id: eventId } = await params;

  let body: z.infer<typeof streamMatchesSchema>;
  try {
    const rawBody = await request.json().catch(() => ({}));
    body = streamMatchesSchema.parse(rawBody);
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const { minScore, maxPerGender } = body;

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return new Response("Event not found", { status: 404 });
  }

  if (!event.location) {
    return new Response(
      "Event must have a location set before generating matches",
      { status: 400 },
    );
  }

  // Pool-based: all approved applicants in the event's city.
  // Ordered by fewest events attended (newcomers first), then oldest
  // applicants first (longest-waiting get priority when capped).
  const applicants = await db.applicant.findMany({
    where: {
      applicationStatus: ApplicationStatus.APPROVED,
      screeningStatus: ScreeningStatus.PASSED,
      deletedAt: null,
      questionnaireAnswers: { some: {} },
      location: event.location,
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
      _count: {
        select: {
          eventInvitations: {
            where: { status: "ATTENDED" },
          },
        },
      },
    },
    orderBy: [{ createdAt: "asc" }],
  });

  // Stable sort: fewest events attended first (preserves createdAt ASC within each bucket)
  applicants.sort(
    (a, b) => a._count.eventInvitations - b._count.eventInvitations,
  );

  const allMen = applicants.filter((a) => a.gender === "MAN");
  const allWomen = applicants.filter((a) => a.gender === "WOMAN");
  const men = allMen.slice(0, maxPerGender);
  const women = allWomen.slice(0, maxPerGender);
  const truncated =
    allMen.length > maxPerGender || allWomen.length > maxPerGender;
  const totalPairs = men.length * women.length;

  const allIds = [...men.map((m) => m.id), ...women.map((w) => w.id)];
  const cache = await preloadAnswerCache(allIds);

  const signal = request.signal;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        send("init", {
          totalPairs,
          menCount: men.length,
          womenCount: women.length,
          truncated,
          totalMen: allMen.length,
          totalWomen: allWomen.length,
        });

        const startTime = Date.now();

        const { allScores, recommendations: allRecommendations } =
          await scoreAllPairs(
            men,
            women,
            cache,
            minScore,
            async (scored, total) => {
              if (signal.aborted) throw new Error("Client disconnected");

              if (scored % 10 === 0 || scored === total) {
                send("progress", {
                  scored,
                  totalPairs: total,
                  pct: Math.round((scored / total) * 100),
                  elapsedMs: Date.now() - startTime,
                });
                await new Promise<void>((resolve) => setImmediate(resolve));
              }
            },
          );

        const distinctMatches = computeDistinctMatches(allRecommendations);

        send("complete", {
          elapsedMs: Date.now() - startTime,
          recommendations: allRecommendations,
          distinctMatches,
          distinctCount: distinctMatches.length,
          matrix: {
            men: men.map((m) => ({
              id: m.id,
              name: `${m.user.firstName} ${m.user.lastName}`,
              eventsAttended: m._count.eventInvitations,
            })),
            women: women.map((w) => ({
              id: w.id,
              name: `${w.user.firstName} ${w.user.lastName}`,
              eventsAttended: w._count.eventInvitations,
            })),
            allPairScores: allScores,
            truncated,
            totalMen: allMen.length,
            totalWomen: allWomen.length,
          },
          avgScore:
            allRecommendations.length > 0
              ? Math.round(
                  allRecommendations.reduce((s, r) => s + r.score, 0) /
                    allRecommendations.length,
                )
              : 0,
        });
      } catch (error) {
        if (!signal.aborted) {
          console.error("SSE match scoring error:", error);
          try {
            send("error", { message: "Scoring failed unexpectedly." });
          } catch {
            // controller may already be closed
          }
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
