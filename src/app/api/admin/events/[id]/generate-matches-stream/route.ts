import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  preloadAnswerCache,
  scoreAllPairs,
} from "@/lib/matching/weighted-compatibility";
import { ApplicationStatus, ScreeningStatus } from "@prisma/client";
import { z } from "zod";

const streamMatchesSchema = z.object({
  minScore: z.number().min(0).max(100).optional().default(60),
  maxPerGender: z.number().int().min(1).max(100).optional().default(50),
  location: z.string().optional(),
});

/**
 * SSE endpoint that streams match scoring progress in real time.
 * Sends events: "progress" (pair scored), "complete" (all done with results).
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

  const { minScore, maxPerGender, location } = body;

  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return new Response("Event not found", { status: 404 });
  }

  const applicants = await db.applicant.findMany({
    where: {
      applicationStatus: ApplicationStatus.APPROVED,
      screeningStatus: ScreeningStatus.PASSED,
      deletedAt: null,
      questionnaireAnswers: { some: {} },
      ...(location ? { location } : {}),
      eventInvitations: {
        some: {
          eventId,
          status: { notIn: ["DECLINED", "NO_SHOW"] },
        },
      },
    },
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
  });

  const allMen = applicants.filter((a) => a.gender === "MAN");
  const allWomen = applicants.filter((a) => a.gender === "WOMAN");
  const men = allMen.slice(0, maxPerGender);
  const women = allWomen.slice(0, maxPerGender);
  const truncated =
    allMen.length > maxPerGender || allWomen.length > maxPerGender;
  const totalPairs = men.length * women.length;

  const allIds = [...men.map((m) => m.id), ...women.map((w) => w.id)];
  const cache = await preloadAnswerCache(allIds);

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

        // Stream progress every 10 pairs to avoid flooding.
        // The callback is async so the event loop yields between batches,
        // allowing the ReadableStream controller to actually flush chunks
        // to the client instead of buffering everything until scoring finishes.
        const { allScores, recommendations: allRecommendations } =
          await scoreAllPairs(
            men,
            women,
            cache,
            minScore,
            async (scored, total) => {
              if (scored % 10 === 0 || scored === total) {
                send("progress", {
                  scored,
                  totalPairs: total,
                  pct: Math.round((scored / total) * 100),
                  elapsedMs: Date.now() - startTime,
                });
                // Yield the event loop so the enqueued chunk is flushed before
                // scoring continues. Without this await all enqueues happen
                // synchronously and the client receives them all at once.
                await new Promise<void>((resolve) => setImmediate(resolve));
              }
            },
          );

        // Compute distinct matches — single set covers both roles so the same
        // person cannot appear in two matches regardless of which side they're on.
        const sortedRecs = [...allRecommendations].sort(
          (a, b) => b.score - a.score,
        );
        const usedPeople = new Set<string>();
        const distinctMatches: typeof allRecommendations = [];
        for (const pair of sortedRecs) {
          if (
            !usedPeople.has(pair.applicantId) &&
            !usedPeople.has(pair.partnerId)
          ) {
            distinctMatches.push(pair);
            usedPeople.add(pair.applicantId);
            usedPeople.add(pair.partnerId);
          }
        }

        send("complete", {
          elapsedMs: Date.now() - startTime,
          recommendations: allRecommendations,
          distinctMatches,
          distinctCount: distinctMatches.length,
          matrix: {
            men: men.map((m) => ({
              id: m.id,
              name: `${m.user.firstName} ${m.user.lastName}`,
            })),
            women: women.map((w) => ({
              id: w.id,
              name: `${w.user.firstName} ${w.user.lastName}`,
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
        console.error("SSE match scoring error:", error);
        try {
          send("error", { message: "Scoring failed unexpectedly." });
        } catch {
          // controller may already be closed
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
