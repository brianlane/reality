import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  preloadAnswerCache,
  scoreAllPairs,
} from "@/lib/matching/weighted-compatibility";
import { ApplicationStatus, ScreeningStatus } from "@prisma/client";
import { z } from "zod";

const validateCohortSchema = z.object({
  minScore: z.number().min(0).max(100).optional().default(65),
  location: z.string().optional(),
});

type ValidateCohortRequest = z.infer<typeof validateCohortSchema>;

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

  let body: ValidateCohortRequest;
  try {
    const rawBody = await request.json().catch(() => ({}));
    body = validateCohortSchema.parse(rawBody);
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400, [
      { message: (error as Error).message },
    ]);
  }

  const { minScore, location } = body;

  const event = await db.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    return errorResponse("NOT_FOUND", "Event not found", 404);
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

  const menApplicants = applicants.filter((a) => a.gender === "MAN");
  const womenApplicants = applicants.filter((a) => a.gender === "WOMAN");

  const men = menApplicants.map((a) => ({
    id: a.id,
    name: `${a.user.firstName} ${a.user.lastName}`,
    location: a.location,
  }));

  const women = womenApplicants.map((a) => ({
    id: a.id,
    name: `${a.user.firstName} ${a.user.lastName}`,
    location: a.location,
  }));

  if (men.length === 0 || women.length === 0) {
    return errorResponse(
      "INSUFFICIENT_DATA",
      "Need at least 1 man and 1 woman invited to validate cohort",
      400,
    );
  }

  // Batch-load all answers in 2 queries instead of N*M
  const allIds = [...men.map((m) => m.id), ...women.map((w) => w.id)];
  const cache = await preloadAnswerCache(allIds);

  const { allScores } = await scoreAllPairs(men, women, cache, minScore);

  // Attach names from the men/women arrays (scoreAllPairs only needs id + location)
  const nameById = new Map<string, string>(
    [...men, ...women].map((p) => [p.id, p.name]),
  );
  const matrix = allScores.map((ps) => ({
    manId: ps.manId,
    manName: nameById.get(ps.manId) ?? ps.manId,
    womanId: ps.womanId,
    womanName: nameById.get(ps.womanId) ?? ps.womanId,
    score: ps.score,
    dealbreakersViolated: ps.dealbreakersViolated,
  }));

  const belowThreshold = matrix.filter((p) => p.score < minScore);
  const scores = matrix.map((p) => p.score);
  const totalPairs = matrix.length;
  const passingPairs = totalPairs - belowThreshold.length;

  return successResponse({
    valid: belowThreshold.length === 0,
    minScore,
    men,
    women,
    matrix,
    belowThreshold,
    stats: {
      totalPairs,
      passingPairs,
      failingPairs: belowThreshold.length,
      lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
      highestScore: scores.length > 0 ? Math.max(...scores) : 0,
      avgScore:
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0,
    },
  });
}
