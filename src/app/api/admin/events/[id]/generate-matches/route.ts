import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getRecommendations } from "@/lib/matching/recommendations";
import {
  buildCompatibleCohort,
  computeDistinctMatches,
  preloadAnswerCache,
  scoreAllPairs,
} from "@/lib/matching/weighted-compatibility";
import { ApplicationStatus, ScreeningStatus } from "@prisma/client";
import { z } from "zod";

const generateMatchesSchema = z.object({
  maxPerApplicant: z.number().int().min(1).max(50).optional().default(5),
  minScore: z.number().min(0).max(100).optional().default(60),
  createMatches: z.boolean().optional().default(true),
  mode: z.enum(["top_n", "all_pairs"]).optional().default("top_n"),
  maxPerGender: z.number().int().min(1).max(100).optional().default(50),
  distinct: z.boolean().optional().default(false),
  /** Pre-computed pairs from a preview — skips scoring and creates these directly. */
  explicitPairs: z
    .array(
      z.object({
        applicantId: z.string(),
        partnerId: z.string(),
        score: z.number(),
      }),
    )
    .optional(),
});

type GenerateMatchesRequest = z.infer<typeof generateMatchesSchema>;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }

  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const { id: eventId } = await params;

  let body: GenerateMatchesRequest;
  try {
    const rawBody = await request.json().catch(() => ({}));
    body = generateMatchesSchema.parse(rawBody);
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400, [
      { message: (error as Error).message },
    ]);
  }

  const {
    maxPerApplicant,
    minScore,
    createMatches,
    mode,
    maxPerGender,
    distinct,
    explicitPairs,
  } = body;

  const event = await db.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return errorResponse("NOT_FOUND", "Event not found", 404);
  }

  if (!event.location) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Event must have a location set before generating matches",
      400,
    );
  }

  // ── Explicit pairs shortcut (from preview) ──────────────────────────────
  if (explicitPairs && explicitPairs.length > 0 && createMatches) {
    const allPairIds = new Set(
      explicitPairs.flatMap((p) => [p.applicantId, p.partnerId]),
    );
    const validApplicants = await db.applicant.findMany({
      where: {
        id: { in: [...allPairIds] },
        deletedAt: null,
        applicationStatus: ApplicationStatus.APPROVED,
      },
      select: { id: true },
    });
    const validIds = new Set(validApplicants.map((a) => a.id));
    const invalidIds = [...allPairIds].filter((id) => !validIds.has(id));
    if (invalidIds.length > 0) {
      return errorResponse(
        "VALIDATION_ERROR",
        `${invalidIds.length} applicant ID(s) not found or not approved`,
        400,
      );
    }

    const seen = new Set<string>();
    const matchesToCreate: Array<{
      eventId: string;
      applicantId: string;
      partnerId: string;
      type: "CURATED";
      compatibilityScore: number;
    }> = [];
    for (const pair of explicitPairs) {
      const [a, b] =
        pair.applicantId < pair.partnerId
          ? [pair.applicantId, pair.partnerId]
          : [pair.partnerId, pair.applicantId];
      const key = `${a}:${b}`;
      if (!seen.has(key)) {
        seen.add(key);
        matchesToCreate.push({
          eventId,
          applicantId: a,
          partnerId: b,
          type: "CURATED",
          compatibilityScore: pair.score,
        });
      }
    }
    try {
      const result = await db.match.createMany({
        data: matchesToCreate,
        skipDuplicates: true,
      });
      return successResponse({
        event: { id: event.id, name: event.name },
        mode: "explicit",
        matchesCreated: result.count,
        avgScore:
          explicitPairs.length > 0
            ? Math.round(
                explicitPairs.reduce((s, p) => s + p.score, 0) /
                  explicitPairs.length,
              )
            : 0,
      });
    } catch (error) {
      console.error("Failed to create explicit matches:", error);
      return errorResponse(
        "DATABASE_ERROR",
        "Failed to create matches in database",
        500,
      );
    }
  }

  // ── Pool-based applicant query (by event location, not invitations) ─────
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

  if (applicants.length < 2) {
    return errorResponse(
      "INSUFFICIENT_DATA",
      `Need at least 2 approved applicants in ${event.location} with completed questionnaires (found ${applicants.length})`,
      400,
    );
  }

  // ── Generate recommendations ────────────────────────────────────────────
  const allRecommendations: Array<{
    applicantId: string;
    partnerId: string;
    score: number;
    dealbreakers: string[];
  }> = [];

  let matrixData:
    | {
        men: Array<{ id: string; name: string; eventsAttended: number }>;
        women: Array<{ id: string; name: string; eventsAttended: number }>;
        allPairScores: Array<{
          manId: string;
          womanId: string;
          score: number;
          dealbreakersViolated: string[];
        }>;
        truncated: boolean;
        totalMen: number;
        totalWomen: number;
        comparedMen: number;
        comparedWomen: number;
      }
    | undefined;

  if (mode === "all_pairs") {
    const allMen = applicants.filter((a) => a.gender === "MAN");
    const allWomen = applicants.filter((a) => a.gender === "WOMAN");

    const men = allMen;
    const women = allWomen;
    const menExceeded = false;
    const womenExceeded = false;
    const truncated = false;

    const allIds = [...men.map((m) => m.id), ...women.map((w) => w.id)];
    const cache = await preloadAnswerCache(allIds);

    const { allScores } = await scoreAllPairs(men, women, cache, minScore);
    // Rank candidates by how many passing partners they have, then build cohort
    // from a higher-compatibility subset (prevents collapse on mixed populations).
    const passScores = allScores.filter(
      (s) => s.score >= minScore && s.dealbreakersViolated.length === 0,
    );
    const menPassCount = new Map<string, number>();
    const womenPassCount = new Map<string, number>();
    for (const m of men) menPassCount.set(m.id, 0);
    for (const w of women) womenPassCount.set(w.id, 0);
    for (const s of passScores) {
      menPassCount.set(s.manId, (menPassCount.get(s.manId) ?? 0) + 1);
      womenPassCount.set(s.womanId, (womenPassCount.get(s.womanId) ?? 0) + 1);
    }

    const preselectPerGender = Math.min(
      men.length,
      Math.max(maxPerGender * 3, maxPerGender),
    );
    const candidateMen = [...men]
      .sort(
        (a, b) => (menPassCount.get(b.id) ?? 0) - (menPassCount.get(a.id) ?? 0),
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
      (s) => candidateMenSet.has(s.manId) && candidateWomenSet.has(s.womanId),
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
    allRecommendations.push(
      ...cohort.recommendations.filter(
        (r) => finalMenSet.has(r.applicantId) && finalWomenSet.has(r.partnerId),
      ),
    );

    matrixData = {
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
    };
  } else {
    for (const applicant of applicants) {
      try {
        const recommendations = await getRecommendations(
          applicant,
          applicants,
          {
            maxResults: maxPerApplicant,
            minScore,
          },
        );

        for (const rec of recommendations) {
          allRecommendations.push({
            applicantId: applicant.id,
            partnerId: rec.applicantId,
            score: rec.compatibilityScore,
            dealbreakers: rec.dealbreakersViolated,
          });
        }
      } catch (error) {
        console.error(
          `Failed to get recommendations for ${applicant.id}:`,
          error,
        );
      }
    }
  }

  const distinctMatchList = computeDistinctMatches(allRecommendations);
  const matchSource = distinct ? distinctMatchList : allRecommendations;

  let matchesCreated = 0;
  if (createMatches && matchSource.length > 0) {
    const seen = new Set<string>();
    const uniqueMatches: Array<{
      applicantId: string;
      partnerId: string;
      score: number;
    }> = [];

    for (const rec of matchSource) {
      const [canonicalApplicantId, canonicalPartnerId] =
        rec.applicantId < rec.partnerId
          ? [rec.applicantId, rec.partnerId]
          : [rec.partnerId, rec.applicantId];

      const key = `${canonicalApplicantId}:${canonicalPartnerId}`;

      if (!seen.has(key)) {
        seen.add(key);
        uniqueMatches.push({
          applicantId: canonicalApplicantId,
          partnerId: canonicalPartnerId,
          score: rec.score,
        });
      } else {
        const existing = uniqueMatches.find(
          (m) =>
            m.applicantId === canonicalApplicantId &&
            m.partnerId === canonicalPartnerId,
        );
        if (existing && rec.score > existing.score) {
          existing.score = rec.score;
        }
      }
    }

    const matchesToCreate = uniqueMatches.map((rec) => ({
      eventId,
      applicantId: rec.applicantId,
      partnerId: rec.partnerId,
      type: "CURATED" as const,
      compatibilityScore: rec.score,
    }));

    try {
      const result = await db.match.createMany({
        data: matchesToCreate,
        skipDuplicates: true,
      });
      matchesCreated = result.count;
    } catch (error) {
      console.error("Failed to create matches:", error);
      return errorResponse(
        "DATABASE_ERROR",
        "Failed to create matches in database",
        500,
      );
    }
  }

  return successResponse({
    event: {
      id: event.id,
      name: event.name,
      location: event.location,
    },
    mode,
    distinct,
    applicantsProcessed: applicants.length,
    recommendationsGenerated: allRecommendations.length,
    distinctCount: distinctMatchList.length,
    cohortMenCount: matrixData?.men.length ?? 0,
    cohortWomenCount: matrixData?.women.length ?? 0,
    matchesCreated,
    avgScore:
      allRecommendations.length > 0
        ? Math.round(
            allRecommendations.reduce((sum, r) => sum + r.score, 0) /
              allRecommendations.length,
          )
        : 0,
    recommendations: createMatches ? undefined : allRecommendations,
    distinctMatches: !createMatches ? distinctMatchList : undefined,
    matrix: !createMatches ? matrixData : undefined,
  });
}
