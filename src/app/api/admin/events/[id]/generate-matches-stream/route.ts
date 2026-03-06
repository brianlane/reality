import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  computeDistinctMatches,
  preloadAnswerCache,
  scoreAllPairs,
  selectCohortFromScores,
} from "@/lib/matching/weighted-compatibility";
import { ApplicationStatus, ScreeningStatus } from "@prisma/client";
import { z } from "zod";
import {
  checkScreeningFlags,
  type FlaggedExclusion,
} from "@/lib/matching/filters";

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

  // Screening flag gate: exclude RED-flagged applicants (unless overridden)
  const flaggedExclusions: FlaggedExclusion[] = [];
  const eligibleApplicants = applicants.filter((a) => {
    const exclusion = checkScreeningFlags(a);
    if (exclusion) {
      flaggedExclusions.push(exclusion);
      return false;
    }
    return true;
  });

  if (eligibleApplicants.length < 2) {
    return new Response(
      `Need at least 2 approved applicants in ${event.location} with completed questionnaires (found ${eligibleApplicants.length} eligible, ${flaggedExclusions.length} excluded by screening flags)`,
      { status: 400 },
    );
  }

  const allMen = eligibleApplicants.filter((a) => a.gender === "MAN");
  const allWomen = eligibleApplicants.filter((a) => a.gender === "WOMAN");
  const totalPairs = allMen.length * allWomen.length;

  const allIds = [...allMen.map((m) => m.id), ...allWomen.map((w) => w.id)];
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
          menCount: allMen.length,
          womenCount: allWomen.length,
          truncated: false,
          totalMen: allMen.length,
          totalWomen: allWomen.length,
          flaggedExclusions:
            flaggedExclusions.length > 0 ? flaggedExclusions : undefined,
          applicantsExcludedByFlags: flaggedExclusions.length,
        });

        const startTime = Date.now();

        const { allScores } = await scoreAllPairs(
          allMen,
          allWomen,
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

        const {
          finalMenIds,
          finalMenSet,
          finalWomenIds,
          finalWomenSet,
          recommendations: allRecommendations,
        } = selectCohortFromScores(
          allScores,
          allMen,
          allWomen,
          minScore,
          maxPerGender,
        );

        const distinctMatches = computeDistinctMatches(allRecommendations);

        send("complete", {
          elapsedMs: Date.now() - startTime,
          recommendations: allRecommendations,
          distinctMatches,
          distinctCount: distinctMatches.length,
          cohortMenCount: finalMenIds.length,
          cohortWomenCount: finalWomenIds.length,
          matrix: {
            men: allMen
              .filter((m) => finalMenSet.has(m.id))
              .map((m) => ({
                id: m.id,
                name: `${m.user.firstName} ${m.user.lastName}`,
                eventsAttended: m._count.eventInvitations,
              })),
            women: allWomen
              .filter((w) => finalWomenSet.has(w.id))
              .map((w) => ({
                id: w.id,
                name: `${w.user.firstName} ${w.user.lastName}`,
                eventsAttended: w._count.eventInvitations,
              })),
            allPairScores: allScores.filter(
              (s) => finalMenSet.has(s.manId) && finalWomenSet.has(s.womanId),
            ),
            truncated: false,
            totalMen: allMen.length,
            totalWomen: allWomen.length,
            comparedMen: allMen.length,
            comparedWomen: allWomen.length,
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
            const message =
              error instanceof Error
                ? error.message
                : "Scoring failed unexpectedly.";
            send("error", { message });
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
