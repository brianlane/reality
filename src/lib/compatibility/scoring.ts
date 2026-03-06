import { db } from "@/lib/db";
import {
  ApplicationStatus,
  FlagSeverity,
  QuestionnaireQuestion,
  ScreeningStatus,
} from "@prisma/client";
import { applyFilters, checkScreeningFlags } from "@/lib/matching/filters";
import {
  preloadAnswerCache,
  scorePairFromCache,
} from "@/lib/matching/weighted-compatibility";

export interface DraftQuestionMeta {
  prompt: string;
  weight: number;
  dealbreaker: boolean;
}

export interface QuestionConfigVerificationSummary {
  draftWeightedQuestions: number;
  matchedQuestions: number;
  weightMismatchCount: number;
  dealbreakerMismatchCount: number;
  missingInDatabaseCount: number;
  weightMismatches: Array<{
    prompt: string;
    expectedWeight: number;
    actualWeight: number;
  }>;
  dealbreakerMismatches: Array<{
    prompt: string;
    expectedDealbreaker: boolean;
    actualDealbreaker: boolean;
  }>;
  missingInDatabase: string[];
}

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

function normalizePrompt(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`"''""]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getFlagMultiplier(
  readinessFlag: FlagSeverity | null,
  saFlag: FlagSeverity | null,
): number {
  const readiness = readinessFlag ? FLAG_MULTIPLIER[readinessFlag] : 1.0;
  const sa = saFlag ? FLAG_MULTIPLIER[saFlag] : 1.0;
  return readiness * sa;
}

export function parseDraftQuestionMetadata(
  markdown: string,
): DraftQuestionMeta[] {
  const lines = markdown.split("\n");
  const out: DraftQuestionMeta[] = [];

  for (const line of lines) {
    const match = line.match(/^\s*\d+\.\s+(.*?)\s+`?\[([^\]]+)\]`?\s*$/);
    if (!match) continue;

    const prompt = match[1]?.trim();
    const annotation = match[2] ?? "";
    if (!prompt) continue;

    const weightMatch = annotation.match(/\bw\s*=\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (!weightMatch) continue;

    const weight = Number(weightMatch[1]);
    if (Number.isNaN(weight)) continue;

    const dealbreaker = /\bdealbreaker\s*=\s*true\b/i.test(annotation);
    out.push({ prompt, weight, dealbreaker });
  }

  return out;
}

export function verifyQuestionConfigAgainstDraft(
  draftMeta: DraftQuestionMeta[],
  questions: Pick<
    QuestionnaireQuestion,
    "prompt" | "mlWeight" | "isDealbreaker"
  >[],
): QuestionConfigVerificationSummary {
  const byPrompt = new Map(
    questions.map((q) => [normalizePrompt(q.prompt), q] as const),
  );
  const weightMismatches: QuestionConfigVerificationSummary["weightMismatches"] =
    [];
  const dealbreakerMismatches: QuestionConfigVerificationSummary["dealbreakerMismatches"] =
    [];
  const missingInDatabase: string[] = [];
  let matchedQuestions = 0;

  for (const expected of draftMeta) {
    const actual = byPrompt.get(normalizePrompt(expected.prompt));
    if (!actual) {
      missingInDatabase.push(expected.prompt);
      continue;
    }

    matchedQuestions++;

    if (Math.abs(actual.mlWeight - expected.weight) > 1e-6) {
      weightMismatches.push({
        prompt: expected.prompt,
        expectedWeight: expected.weight,
        actualWeight: actual.mlWeight,
      });
    }

    if (Boolean(actual.isDealbreaker) !== expected.dealbreaker) {
      dealbreakerMismatches.push({
        prompt: expected.prompt,
        expectedDealbreaker: expected.dealbreaker,
        actualDealbreaker: Boolean(actual.isDealbreaker),
      });
    }
  }

  return {
    draftWeightedQuestions: draftMeta.length,
    matchedQuestions,
    weightMismatchCount: weightMismatches.length,
    dealbreakerMismatchCount: dealbreakerMismatches.length,
    missingInDatabaseCount: missingInDatabase.length,
    weightMismatches,
    dealbreakerMismatches,
    missingInDatabase,
  };
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
