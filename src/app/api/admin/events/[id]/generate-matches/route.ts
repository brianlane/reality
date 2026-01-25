import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getRecommendations } from "@/lib/matching/recommendations";
import { ApplicationStatus, ScreeningStatus } from "@prisma/client";
import { z } from "zod";

const generateMatchesSchema = z.object({
  maxPerApplicant: z.number().int().min(1).max(50).optional().default(5),
  minScore: z.number().min(0).max(100).optional().default(60),
  createMatches: z.boolean().optional().default(true),
});

type GenerateMatchesRequest = z.infer<typeof generateMatchesSchema>;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // 1. Authenticate and authorize
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

  // 2. Parse and validate request body
  let body: GenerateMatchesRequest;
  try {
    const rawBody = await request.json().catch(() => ({}));
    body = generateMatchesSchema.parse(rawBody);
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400, [
      { message: (error as Error).message },
    ]);
  }

  const maxPerApplicant = body.maxPerApplicant;
  const minScore = body.minScore;
  const createMatches = body.createMatches;

  // 3. Verify event exists
  const event = await db.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return errorResponse("NOT_FOUND", "Event not found", 404);
  }

  // 4. Get all approved applicants with completed questionnaires
  // Filter by event invitations to only include applicants invited to this specific event
  // Exclude those who declined or didn't show up
  const applicants = await db.applicant.findMany({
    where: {
      applicationStatus: ApplicationStatus.APPROVED,
      screeningStatus: ScreeningStatus.PASSED,
      deletedAt: null,
      questionnaire: {
        isNot: null,
      },
      eventInvitations: {
        some: {
          eventId: eventId,
          status: {
            notIn: ["DECLINED", "NO_SHOW"],
          },
        },
      },
    },
    include: {
      questionnaire: true,
    },
  });

  if (applicants.length < 2) {
    return errorResponse(
      "INSUFFICIENT_DATA",
      "Need at least 2 approved applicants with completed questionnaires",
      400,
    );
  }

  // 5. Generate recommendations for each applicant
  const allRecommendations: Array<{
    applicantId: string;
    partnerId: string;
    score: number;
    dealbreakers: string[];
  }> = [];

  for (const applicant of applicants) {
    try {
      const recommendations = await getRecommendations(applicant, applicants, {
        maxResults: maxPerApplicant,
        minScore,
      });

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
      // Continue with other applicants
    }
  }

  // 6. Create matches if requested
  let matchesCreated = 0;
  if (createMatches && allRecommendations.length > 0) {
    // Deduplicate bidirectional matches: for mutual pairs (A,B) and (B,A),
    // only create one match record using canonical ordering (smaller ID first).
    // This ensures consistent storage and prevents reverse duplicates in future runs.
    const seen = new Set<string>();
    const uniqueMatches: Array<{
      applicantId: string;
      partnerId: string;
      score: number;
    }> = [];

    for (const rec of allRecommendations) {
      // Canonical ordering: always store with smaller ID as applicantId
      const [canonicalApplicantId, canonicalPartnerId] =
        rec.applicantId < rec.partnerId
          ? [rec.applicantId, rec.partnerId]
          : [rec.partnerId, rec.applicantId];

      const key = `${canonicalApplicantId}:${canonicalPartnerId}`;

      if (!seen.has(key)) {
        seen.add(key);
        // For mutual matches, use the higher score (both parties compatible)
        uniqueMatches.push({
          applicantId: canonicalApplicantId,
          partnerId: canonicalPartnerId,
          score: rec.score,
        });
      } else {
        // Found the reverse pair - update score if this one is higher
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
        skipDuplicates: true, // Skip if match already exists
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

  // 7. Return summary
  return successResponse({
    event: {
      id: event.id,
      name: event.name,
    },
    applicantsProcessed: applicants.length,
    recommendationsGenerated: allRecommendations.length,
    matchesCreated,
    avgScore:
      allRecommendations.length > 0
        ? Math.round(
            allRecommendations.reduce((sum, r) => sum + r.score, 0) /
              allRecommendations.length,
          )
        : 0,
    recommendations: createMatches ? undefined : allRecommendations, // Only return if not creating
  });
}
