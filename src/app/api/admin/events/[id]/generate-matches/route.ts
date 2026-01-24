import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getRecommendations } from "@/lib/matching/recommendations";
import { ApplicationStatus, ScreeningStatus } from "@prisma/client";

interface GenerateMatchesRequest {
  maxPerApplicant?: number;
  minScore?: number;
  createMatches?: boolean; // If false, just return recommendations without creating
}

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

  // 2. Parse request body
  let body: GenerateMatchesRequest;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const maxPerApplicant = body.maxPerApplicant ?? 5;
  const minScore = body.minScore ?? 60;
  const createMatches = body.createMatches ?? true;

  // 3. Verify event exists
  const event = await db.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return errorResponse("NOT_FOUND", "Event not found", 404);
  }

  // 4. Get all approved applicants with completed questionnaires
  // Filter by event invitations to only include applicants invited to this specific event
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
    const matchesToCreate = allRecommendations.map((rec) => ({
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
