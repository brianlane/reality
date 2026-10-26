import { Prisma } from "@prisma/client";
import { getAuthUser, isAdminEmail } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getApplicantByEmail } from "@/lib/applicant-helpers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Applicant post-date debrief. Captures structured feedback into
 * MatchAnalytics (side-aware) and merges a copy into the match's
 * day30FollowUp JSON. This is the structured capture layer; the
 * conversational agent-led debrief is a later PR.
 */
export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  if (isAdminEmail(auth.email)) {
    return errorResponse("FORBIDDEN", "Applicant access required", 403);
  }
  if (!auth.email) {
    return errorResponse("UNAUTHORIZED", "Email not available", 401);
  }

  const applicant = await getApplicantByEmail(auth.email);
  if (!applicant) {
    return errorResponse("UNAUTHORIZED", "Applicant not found", 401);
  }

  const match = await db.match.findFirst({
    where: {
      id,
      OR: [{ applicantId: applicant.id }, { partnerId: applicant.id }],
      notifiedAt: { not: null },
      deletedAt: null,
    },
    include: { analytics: true },
  });
  if (!match) {
    return errorResponse("NOT_FOUND", "Match not found", 404);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "Request body must be JSON", 400);
  }

  const { rating, feedback, dateHappened, wouldSeeAgain } = (body ?? {}) as {
    rating?: number;
    feedback?: string;
    dateHappened?: boolean;
    wouldSeeAgain?: boolean;
  };

  if (
    rating !== undefined &&
    (!Number.isInteger(rating) || rating < 1 || rating > 5)
  ) {
    return errorResponse("INVALID_BODY", "rating must be an integer 1-5", 400);
  }
  if (feedback !== undefined && typeof feedback !== "string") {
    return errorResponse("INVALID_BODY", "feedback must be a string", 400);
  }
  if (dateHappened !== undefined && typeof dateHappened !== "boolean") {
    return errorResponse("INVALID_BODY", "dateHappened must be a boolean", 400);
  }
  if (wouldSeeAgain !== undefined && typeof wouldSeeAgain !== "boolean") {
    return errorResponse(
      "INVALID_BODY",
      "wouldSeeAgain must be a boolean",
      400,
    );
  }
  if (
    rating === undefined &&
    feedback === undefined &&
    dateHappened === undefined &&
    wouldSeeAgain === undefined
  ) {
    return errorResponse("INVALID_BODY", "Nothing to save", 400);
  }

  const isApplicantSide = match.applicantId === applicant.id;
  const side = isApplicantSide ? "applicant" : "partner";

  const analyticsData: {
    applicantRating?: number;
    applicantFeedback?: string;
    partnerRating?: number;
    partnerFeedback?: string;
    dateCompleted?: boolean;
    dateCompletedAt?: Date;
  } = {};
  if (rating !== undefined) {
    analyticsData[isApplicantSide ? "applicantRating" : "partnerRating"] =
      rating;
  }
  if (feedback !== undefined) {
    analyticsData[isApplicantSide ? "applicantFeedback" : "partnerFeedback"] =
      feedback;
  }
  if (dateHappened === true && !match.analytics?.dateCompleted) {
    analyticsData.dateCompleted = true;
    analyticsData.dateCompletedAt = new Date();
  }

  if (Object.keys(analyticsData).length > 0) {
    await db.matchAnalytics.upsert({
      where: { matchId: match.id },
      update: analyticsData,
      create: { matchId: match.id, ...analyticsData },
    });
  }

  // Merge a copy into the longitudinal follow-up JSON.
  const existing = (match.day30FollowUp ?? {}) as Prisma.JsonObject;
  const debriefs = (existing.debriefs as Prisma.JsonObject | undefined) ?? {};
  debriefs[side] = {
    rating: rating ?? null,
    feedback: feedback ?? null,
    dateHappened: dateHappened ?? null,
    wouldSeeAgain: wouldSeeAgain ?? null,
    submittedAt: new Date().toISOString(),
  };
  await db.match.update({
    where: { id: match.id },
    data: { day30FollowUp: { ...existing, debriefs } },
  });

  return successResponse({ ok: true });
}
