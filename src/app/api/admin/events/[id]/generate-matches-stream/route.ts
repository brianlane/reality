import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildCompatibleCohort,
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
  const men = allMen;
  const women = allWomen;
  const truncated = false;
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

        const { allScores } = await scoreAllPairs(
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

        // Rank candidates by passing-partner counts, then build cohort from
        // that higher-compatibility subset first.
        const passScores = allScores.filter(
          (s) => s.score >= minScore && s.dealbreakersViolated.length === 0,
        );
        const menPassCount = new Map<string, number>();
        const womenPassCount = new Map<string, number>();
        for (const m of men) menPassCount.set(m.id, 0);
        for (const w of women) womenPassCount.set(w.id, 0);
        for (const s of passScores) {
          menPassCount.set(s.manId, (menPassCount.get(s.manId) ?? 0) + 1);
          womenPassCount.set(
            s.womanId,
            (womenPassCount.get(s.womanId) ?? 0) + 1,
          );
        }

        const preselectPerGender = Math.min(
          men.length,
          Math.max(maxPerGender * 3, maxPerGender),
        );
        const candidateMen = [...men]
          .sort(
            (a, b) =>
              (menPassCount.get(b.id) ?? 0) - (menPassCount.get(a.id) ?? 0),
          )
          .slice(0, preselectPerGender);
        const candidateWomen = [...women]
          .sort(
            (a, b) =>
              (womenPassCount.get(b.id) ?? 0) - (womenPassCount.get(a.id) ?? 0),
          )
          .slice(0, preselectPerGender);
        const candidateMenSet = new Set(candidateMen.map((m) => m.id));
        const candidateWomenSet = new Set(candidateWomen.map((w) => w.id));
        const candidateScores = allScores.filter(
          (s) =>
            candidateMenSet.has(s.manId) && candidateWomenSet.has(s.womanId),
        );

        let cohort = buildCompatibleCohort(
          candidateScores,
          candidateMen,
          candidateWomen,
          minScore,
        );
        if (cohort.menIds.length === 0 || cohort.womenIds.length === 0) {
          cohort = buildCompatibleCohort(allScores, men, women, minScore);
        }
        const finalMenIds = cohort.menIds.slice(0, maxPerGender);
        const finalWomenIds = cohort.womenIds.slice(0, maxPerGender);
        const finalMenSet = new Set(finalMenIds);
        const finalWomenSet = new Set(finalWomenIds);

        const allRecommendations = cohort.recommendations.filter(
          (r) =>
            finalMenSet.has(r.applicantId) && finalWomenSet.has(r.partnerId),
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
            men: men
              .filter((m) => finalMenSet.has(m.id))
              .map((m) => ({
                id: m.id,
                name: `${m.user.firstName} ${m.user.lastName}`,
                eventsAttended: m._count.eventInvitations,
              })),
            women: women
              .filter((w) => finalWomenSet.has(w.id))
              .map((w) => ({
                id: w.id,
                name: `${w.user.firstName} ${w.user.lastName}`,
                eventsAttended: w._count.eventInvitations,
              })),
            allPairScores: allScores.filter(
              (s) => finalMenSet.has(s.manId) && finalWomenSet.has(s.womanId),
            ),
            truncated,
            totalMen: allMen.length,
            totalWomen: allWomen.length,
            comparedMen: men.length,
            comparedWomen: women.length,
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
