import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  preloadAnswerCache,
  scorePairFromCache,
  locationSimilarity,
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

  const LOCATION_WEIGHT = 0.1;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      send("init", {
        totalPairs,
        menCount: men.length,
        womenCount: women.length,
        truncated,
        totalMen: allMen.length,
        totalWomen: allWomen.length,
      });

      const allScores: Array<{
        manId: string;
        womanId: string;
        score: number;
        dealbreakersViolated: string[];
      }> = [];

      const allRecommendations: Array<{
        applicantId: string;
        partnerId: string;
        score: number;
        dealbreakers: string[];
      }> = [];

      let scored = 0;
      const startTime = Date.now();

      for (const man of men) {
        const manAnswers = cache.answersByApplicant.get(man.id) ?? new Map();
        for (const woman of women) {
          try {
            const womanAnswers =
              cache.answersByApplicant.get(woman.id) ?? new Map();
            const result = scorePairFromCache(
              cache.questions,
              manAnswers,
              womanAnswers,
            );

            let adjustedScore = result.score;
            if (
              result.dealbreakersViolated.length === 0 &&
              man.location &&
              woman.location
            ) {
              const locSim = locationSimilarity(man.location, woman.location);
              adjustedScore = Math.round(
                result.score * (1 - LOCATION_WEIGHT) +
                  locSim * 100 * LOCATION_WEIGHT,
              );
            }

            allScores.push({
              manId: man.id,
              womanId: woman.id,
              score: adjustedScore,
              dealbreakersViolated: result.dealbreakersViolated,
            });

            if (
              adjustedScore >= minScore &&
              result.dealbreakersViolated.length === 0
            ) {
              allRecommendations.push({
                applicantId: man.id,
                partnerId: woman.id,
                score: adjustedScore,
                dealbreakers: result.dealbreakersViolated,
              });
            }
          } catch {
            allScores.push({
              manId: man.id,
              womanId: woman.id,
              score: 0,
              dealbreakersViolated: [],
            });
          }

          scored++;
          // Stream progress every 10 pairs or on last pair to avoid flooding
          if (scored % 10 === 0 || scored === totalPairs) {
            send("progress", {
              scored,
              totalPairs,
              pct: Math.round((scored / totalPairs) * 100),
              elapsedMs: Date.now() - startTime,
            });
          }
        }
      }

      // Compute distinct matches
      const sortedRecs = [...allRecommendations].sort(
        (a, b) => b.score - a.score,
      );
      const usedA = new Set<string>();
      const usedB = new Set<string>();
      const distinctMatches: typeof allRecommendations = [];
      for (const pair of sortedRecs) {
        if (!usedA.has(pair.applicantId) && !usedB.has(pair.partnerId)) {
          distinctMatches.push(pair);
          usedA.add(pair.applicantId);
          usedB.add(pair.partnerId);
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
