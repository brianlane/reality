import { db } from "@/lib/db";
import {
  ApplicationStatus,
  FlagSeverity,
  ScreeningStatus,
} from "@prisma/client";
import { applyFilters, checkScreeningFlags } from "@/lib/matching/filters";
import {
  preloadAnswerCache,
  scorePairFromCache,
} from "@/lib/matching/weighted-compatibility";

export interface ApplicantCompatibilityResult {
  applicantId: string;
  candidateCount: number;
  averagePairwiseScore: number;
  readinessFlag: FlagSeverity | null;
  saFlag: FlagSeverity | null;
  multiplier: number;
  /** null when no eligible candidates were available to score against */
  finalScore: number | null;
}

// Readiness and SA flags use the same multiplier scale; kept as one table.
const FLAG_MULTIPLIER: Record<FlagSeverity, number> = {
  GREEN: 1.0,
  YELLOW: 0.9,
  RED: 0.7,
};

function getFlagMultiplier(
  readinessFlag: FlagSeverity | null,
  saFlag: FlagSeverity | null,
): number {
  const readiness = readinessFlag ? FLAG_MULTIPLIER[readinessFlag] : 1.0;
  const sa = saFlag ? FLAG_MULTIPLIER[saFlag] : 1.0;
  return readiness * sa;
}

/**
 * Compute and persist the compatibility score for a single applicant.
 *
 * Scores the applicant against every other eligible (approved, passed,
 * same location, matching gender/seeking) candidate, averages the pairwise
 * scores, then applies readiness × SA-risk multipliers.
 *
 * Designed to be called fire-and-forget on approval so the score is ready
 * by the time an admin views the applicant.
 */
export async function computeAndStoreApplicantCompatibility(
  applicantId: string,
): Promise<ApplicantCompatibilityResult> {
  const applicant = await db.applicant.findUniqueOrThrow({
    where: { id: applicantId },
  });

  const candidates = await db.applicant.findMany({
    where: {
      id: { not: applicantId },
      deletedAt: null,
      applicationStatus: ApplicationStatus.APPROVED,
      screeningStatus: ScreeningStatus.PASSED,
      location: applicant.location,
    },
  });

  const filtered = applyFilters(applicant, candidates);

  const eligible = filtered.filter((c) => !checkScreeningFlags(c));

  const allIds = [applicantId, ...eligible.map((c) => c.id)];
  const cache = await preloadAnswerCache(allIds);

  const answersA = cache.answersByApplicant.get(applicantId) ?? new Map();
  let pairwiseSum = 0;
  let candidateCount = 0;

  for (const candidate of eligible) {
    const answersB = cache.answersByApplicant.get(candidate.id) ?? new Map();
    const pair = scorePairFromCache(
      cache.questions,
      answersA,
      answersB,
      cache.crossPairIndex,
    );
    pairwiseSum += pair.score;
    candidateCount++;
  }

  const avgPairwiseScore =
    candidateCount > 0 ? pairwiseSum / candidateCount : 0;
  const multiplier = getFlagMultiplier(
    applicant.relationshipReadinessFlag,
    applicant.saScreeningFlag,
  );
  // Store null instead of 0 when there are no candidates — a 0 score would be
  // indistinguishable from "scored and truly incompatible with everyone".
  const finalScore =
    candidateCount > 0
      ? Math.round(Math.max(0, Math.min(100, avgPairwiseScore * multiplier)))
      : null;

  await db.applicant.update({
    where: { id: applicantId },
    data: { compatibilityScore: finalScore },
  });

  return {
    applicantId,
    candidateCount,
    averagePairwiseScore: Number(avgPairwiseScore.toFixed(2)),
    readinessFlag: applicant.relationshipReadinessFlag,
    saFlag: applicant.saScreeningFlag,
    multiplier: Number(multiplier.toFixed(2)),
    finalScore,
  };
}
