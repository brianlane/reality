import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getRecommendations } from "@/lib/matching/recommendations";
import {
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
      }
    | undefined;

  if (mode === "all_pairs") {
    const allMen = applicants.filter((a) => a.gender === "MAN");
    const allWomen = applicants.filter((a) => a.gender === "WOMAN");

    const menExceeded = allMen.length > maxPerGender;
    const womenExceeded = allWomen.length > maxPerGender;
    const men = menExceeded ? allMen.slice(0, maxPerGender) : allMen;
    const women = womenExceeded ? allWomen.slice(0, maxPerGender) : allWomen;
    const truncated = menExceeded || womenExceeded;

    const allIds = [...men.map((m) => m.id), ...women.map((w) => w.id)];
    const cache = await preloadAnswerCache(allIds);

    const { allScores, recommendations } = await scoreAllPairs(
      men,
      women,
      cache,
      minScore,
    );
    allRecommendations.push(...recommendations);

    matrixData = {
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
