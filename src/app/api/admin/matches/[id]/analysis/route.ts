import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { calculateWeightedCompatibility } from "@/lib/matching/weighted-compatibility";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  const { id } = await params;
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const match = await db.match.findFirst({
    where: { id, deletedAt: null },
    include: {
      applicant: { include: { user: true } },
      partner: { include: { user: true } },
    },
  });

  if (!match) {
    return errorResponse("NOT_FOUND", "Match not found", 404);
  }

  const scoring = await calculateWeightedCompatibility(
    match.applicantId,
    match.partnerId,
  );

  const questionIds = scoring.breakdown.map((b) => b.questionId);

  const [answers, questionMeta] = await Promise.all([
    db.questionnaireAnswer.findMany({
      where: {
        applicantId: { in: [match.applicantId, match.partnerId] },
        questionId: { in: questionIds },
      },
      select: { applicantId: true, questionId: true, value: true },
    }),
    db.questionnaireQuestion.findMany({
      where: { id: { in: questionIds } },
      select: { id: true, isDealbreaker: true, type: true },
    }),
  ]);

  const dealbreakerSet = new Set(
    questionMeta.filter((q) => q.isDealbreaker).map((q) => q.id),
  );
  const typeMap = new Map(questionMeta.map((q) => [q.id, q.type]));

  const answerMap = new Map<
    string,
    { applicantValue: unknown; partnerValue: unknown }
  >();
  for (const answer of answers) {
    if (!answerMap.has(answer.questionId)) {
      answerMap.set(answer.questionId, {
        applicantValue: null,
        partnerValue: null,
      });
    }
    const entry = answerMap.get(answer.questionId)!;
    if (answer.applicantId === match.applicantId) {
      entry.applicantValue = answer.value;
    } else {
      entry.partnerValue = answer.value;
    }
  }

  const breakdown = scoring.breakdown.map((item) => ({
    ...item,
    questionType: typeMap.get(item.questionId) ?? null,
    isDealbreakerQuestion: dealbreakerSet.has(item.questionId),
    dealbreakerViolated: scoring.dealbreakersViolated.includes(item.questionId),
    answerA: answerMap.get(item.questionId)?.applicantValue ?? null,
    answerB: answerMap.get(item.questionId)?.partnerValue ?? null,
  }));

  return successResponse({
    score: scoring.score,
    dealbreakersViolated: scoring.dealbreakersViolated.length,
    questionsScored: scoring.questionsScored,
    applicantName: `${match.applicant.user.firstName} ${match.applicant.user.lastName}`,
    partnerName: `${match.partner.user.firstName} ${match.partner.user.lastName}`,
    breakdown,
  });
}
