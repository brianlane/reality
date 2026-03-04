import { db } from "@/lib/db";
import {
  QuestionnaireQuestion,
  QuestionnaireQuestionType,
} from "@prisma/client";
import {
  CrossPairIndex,
  CROSS_APPLICANT_PAIRS,
  buildCrossPairIndex,
} from "./cross-pair-scoring";

export interface QuestionBreakdown {
  questionId: string;
  prompt: string;
  similarity: number;
  weight: number;
  effectiveWeight: number; // weight after importance modulation (may equal weight)
  weightedScore: number;
}

export interface ScoringResult {
  score: number; // 0-100
  dealbreakersViolated: string[]; // Question IDs
  questionsScored: number;
  breakdown: QuestionBreakdown[];
}

/**
 * Calculate weighted compatibility score between two applicants
 * Uses ALL active questionnaire questions with their weights
 */
export async function calculateWeightedCompatibility(
  applicantId: string,
  candidateId: string,
): Promise<ScoringResult> {
  // 1. Fetch all active questions with their weights and answers from both applicants
  const questions = await db.questionnaireQuestion.findMany({
    where: {
      isActive: true,
      deletedAt: null,
    },
    include: {
      answers: {
        where: {
          applicantId: { in: [applicantId, candidateId] },
        },
      },
    },
    orderBy: { order: "asc" },
  });

  // Build answer maps and delegate to pure scoring
  const answersA = new Map<string, unknown>();
  const answersB = new Map<string, unknown>();
  for (const q of questions) {
    for (const a of q.answers) {
      if (a.value === null) continue;
      if (a.applicantId === applicantId) answersA.set(q.id, a.value);
      else if (a.applicantId === candidateId) answersB.set(q.id, a.value);
    }
  }

  return scorePairFromCache(questions, answersA, answersB);
}

// ── Pre-loaded cache for batch scoring ─────────────────────────────────────

export interface AnswerCache {
  questions: QuestionnaireQuestion[];
  answersByApplicant: Map<string, Map<string, unknown>>;
  /** Cross-pair index built once on load — passed into scorePairFromCache to avoid rebuilding per pair. */
  crossPairIndex: CrossPairIndex;
}

/**
 * Load all questions + answers for a set of applicant IDs in two queries.
 * Returns a cache that can be passed to scorePairFromCache for O(Q) in-memory
 * scoring with zero additional DB round-trips.
 */
export async function preloadAnswerCache(
  applicantIds: string[],
): Promise<AnswerCache> {
  const [questions, answers] = await Promise.all([
    db.questionnaireQuestion.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { order: "asc" },
    }),
    db.questionnaireAnswer.findMany({
      where: {
        applicantId: { in: applicantIds },
        question: { isActive: true, deletedAt: null },
      },
      select: { applicantId: true, questionId: true, value: true },
    }),
  ]);

  const answersByApplicant = new Map<string, Map<string, unknown>>();
  for (const a of answers) {
    if (a.value === null) continue;
    let map = answersByApplicant.get(a.applicantId);
    if (!map) {
      map = new Map();
      answersByApplicant.set(a.applicantId, map);
    }
    map.set(a.questionId, a.value);
  }

  return {
    questions,
    answersByApplicant,
    crossPairIndex: buildCrossPairIndex(questions),
  };
}

/**
 * Pure in-memory scoring using pre-loaded data. No DB calls.
 *
 * Three scoring modes are applied in order:
 *
 * 1. **Cross-applicant pairs** (pets, children): Questions where the meaningful
 *    check is Person A's status ("do you have pets?") against Person B's
 *    preference ("are you ok with partner's pets?"), and vice versa.
 *    These are resolved by prompt substring and handled separately; both
 *    questions are excluded from the main loop.
 *
 * 2. **Importance-modulated questions** (`importanceModifierForId` set): The
 *    question's effective weight is scaled by the average of both applicants'
 *    importance ratings (RADIO_7 1–7 → factor 0.14–1.0). Importance questions
 *    themselves are still scored normally.
 *
 * 3. **Regular questions**: Scored by comparing both applicants' answers with
 *    their configured `mlWeight`.
 */
export function scorePairFromCache(
  questions: QuestionnaireQuestion[],
  answersA: Map<string, unknown>,
  answersB: Map<string, unknown>,
  prebuiltCrossPairIndex?: CrossPairIndex,
): ScoringResult {
  const dealbreakersViolated: string[] = [];
  const breakdown: QuestionBreakdown[] = [];
  let totalWeightedScore = 0;
  let totalWeight = 0;

  // ── Mode 1: Cross-applicant pairs ──────────────────────────────────────
  // Use pre-built index when available (batch path) to avoid rebuilding per pair.
  const { resolved: crossPairs, coveredIds: crossPairIds } =
    prebuiltCrossPairIndex ??
    buildCrossPairIndex(questions, CROSS_APPLICANT_PAIRS);

  for (const pair of crossPairs) {
    const statusA = answersA.get(pair.statusQuestionId);
    const statusB = answersB.get(pair.statusQuestionId);
    const prefA = answersA.get(pair.preferenceQuestionId);
    const prefB = answersB.get(pair.preferenceQuestionId);

    // Skip if we cannot compute at least one complete direction
    const canScoreAtoB = statusA !== undefined && prefB !== undefined;
    const canScoreBtoA = statusB !== undefined && prefA !== undefined;
    if (!canScoreAtoB && !canScoreBtoA) continue;

    const scoreAtoB = canScoreAtoB
      ? pair.config.scoreOneSide(statusA, prefB)
      : 0.5;
    const scoreBtoA = canScoreBtoA
      ? pair.config.scoreOneSide(statusB, prefA)
      : 0.5;

    const crossScore = (scoreAtoB + scoreBtoA) / 2;

    // Each question contributes with its own weight; combined weight replaces
    // what the two questions would have contributed independently.
    const sw = pair.statusWeight;
    const pw = pair.preferenceWeight;

    totalWeightedScore += crossScore * (sw + pw);
    totalWeight += sw + pw;

    breakdown.push({
      questionId: pair.statusQuestionId,
      prompt: `[Cross-pair: ${pair.config.name}] ${questions.find((q) => q.id === pair.statusQuestionId)?.prompt ?? pair.statusQuestionId}`,
      similarity: crossScore,
      weight: sw,
      effectiveWeight: sw,
      weightedScore: crossScore * sw,
    });
    breakdown.push({
      questionId: pair.preferenceQuestionId,
      prompt: `[Cross-pair: ${pair.config.name}] ${questions.find((q) => q.id === pair.preferenceQuestionId)?.prompt ?? pair.preferenceQuestionId}`,
      similarity: crossScore,
      weight: pw,
      effectiveWeight: pw,
      weightedScore: crossScore * pw,
    });
  }

  // ── Mode 2 pre-pass: Importance factors ────────────────────────────────
  // targetQuestionId → 0–1 multiplier based on average importance rating.
  const importanceFactors = new Map<string, number>();
  for (const question of questions) {
    if (!question.importanceModifierForId) continue;
    const impId = question.importanceModifierForId;
    const valA = answersA.get(impId);
    const valB = answersB.get(impId);
    const numA = valA !== undefined ? Number(valA) : 7;
    const numB = valB !== undefined ? Number(valB) : 7;
    importanceFactors.set(question.id, (numA + numB) / 2 / 7);
  }

  // ── Modes 2 + 3: Regular + importance-modulated questions ──────────────
  for (const question of questions) {
    // Skip questions handled by cross-pair scoring above
    if (crossPairIds.has(question.id)) continue;

    const valA = answersA.get(question.id);
    const valB = answersB.get(question.id);

    if (valA === undefined || valB === undefined) continue;

    const similarity = calculateSimilarity(question, valA, valB);

    if (question.isDealbreaker && similarity < 0.5) {
      dealbreakersViolated.push(question.id);
    }

    const importanceFactor = importanceFactors.get(question.id) ?? 1.0;
    const effectiveWeight = question.mlWeight * importanceFactor;
    const weightedScore = similarity * effectiveWeight;
    totalWeightedScore += weightedScore;
    totalWeight += effectiveWeight;

    breakdown.push({
      questionId: question.id,
      prompt: question.prompt,
      similarity,
      weight: question.mlWeight,
      effectiveWeight,
      weightedScore,
    });
  }

  let score =
    totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) : 50;

  if (dealbreakersViolated.length > 0) {
    score = 0;
  }

  return {
    score,
    dealbreakersViolated,
    questionsScored: breakdown.length,
    breakdown,
  };
}

export interface PairScore {
  manId: string;
  womanId: string;
  score: number;
  dealbreakersViolated: string[];
}

export interface ScoredPairsResult {
  allScores: PairScore[];
  recommendations: Array<{
    applicantId: string;
    partnerId: string;
    score: number;
    dealbreakers: string[];
  }>;
}

/**
 * Score every man×woman pair using a pre-loaded cache. No DB calls.
 *
 * @param onProgress - optional async callback invoked after each pair is scored.
 *   For SSE streaming routes, yield the event loop here (e.g. via setImmediate) so
 *   enqueued chunks are actually flushed between progress updates. Without an await
 *   the ReadableStream controller buffers all enqueues synchronously and the client
 *   receives everything in one batch at the end.
 */
export async function scoreAllPairs(
  men: Array<{ id: string }>,
  women: Array<{ id: string }>,
  cache: AnswerCache,
  minScore: number,
  onProgress?: (scored: number, total: number) => void | Promise<void>,
): Promise<ScoredPairsResult> {
  const allScores: PairScore[] = [];
  const recommendations: ScoredPairsResult["recommendations"] = [];
  const total = men.length * women.length;
  let scored = 0;

  for (const man of men) {
    const manAnswers = cache.answersByApplicant.get(man.id) ?? new Map();
    for (const woman of women) {
      try {
        const womanAnswers =
          cache.answersByApplicant.get(woman.id) ?? new Map();
        const result = scorePairFromCache(
          cache.questions,
          manAnswers,
          womanAnswers,
          cache.crossPairIndex,
        );

        allScores.push({
          manId: man.id,
          womanId: woman.id,
          score: result.score,
          dealbreakersViolated: result.dealbreakersViolated,
        });

        if (
          result.score >= minScore &&
          result.dealbreakersViolated.length === 0
        ) {
          recommendations.push({
            applicantId: man.id,
            partnerId: woman.id,
            score: result.score,
            dealbreakers: result.dealbreakersViolated,
          });
        }
      } catch (error) {
        console.error(`Failed to score pair ${man.id} x ${woman.id}:`, error);
        allScores.push({
          manId: man.id,
          womanId: woman.id,
          score: 0,
          dealbreakersViolated: [],
        });
      }

      scored++;
      if (onProgress) await onProgress(scored, total);
    }
  }

  return { allScores, recommendations };
}

/**
 * Greedy 1:1 assignment: sort all qualifying pairs by score descending,
 * then assign each pair only if neither person is already taken.
 * A single Set covers both roles so the same person cannot appear twice
 * regardless of which side they're on.
 */
export function computeDistinctMatches<
  T extends { applicantId: string; partnerId: string; score: number },
>(pairs: T[]): T[] {
  const sorted = [...pairs].sort((a, b) => b.score - a.score);
  const usedPeople = new Set<string>();
  const result: T[] = [];

  for (const pair of sorted) {
    if (!usedPeople.has(pair.applicantId) && !usedPeople.has(pair.partnerId)) {
      result.push(pair);
      usedPeople.add(pair.applicantId);
      usedPeople.add(pair.partnerId);
    }
  }

  return result;
}

/**
 * Calculate similarity between two answer values based on question type
 * Returns a value between 0 (no similarity) and 1 (perfect match)
 */
function calculateSimilarity(
  question: QuestionnaireQuestion,
  valueA: unknown,
  valueB: unknown,
): number {
  switch (question.type) {
    case QuestionnaireQuestionType.NUMBER_SCALE: {
      // For numeric scales, calculate similarity based on distance
      // Check if options is null (misconfigured question)
      if (!question.options || typeof question.options !== "object") {
        // No valid options - treat identical answers as match, different as no match
        return valueA === valueB ? 1.0 : 0.0;
      }

      const options = question.options as { min: number; max: number };

      // Validate that min and max exist and are valid numbers
      if (
        typeof options.min !== "number" ||
        typeof options.max !== "number" ||
        isNaN(options.min) ||
        isNaN(options.max)
      ) {
        // Malformed options object - treat identical answers as match
        return valueA === valueB ? 1.0 : 0.0;
      }

      const diff = Math.abs(Number(valueA) - Number(valueB));
      const maxDelta = options.max - options.min;

      // Handle invalid range (min >= max)
      if (maxDelta <= 0 || isNaN(maxDelta)) {
        // Invalid or zero range - treat same values as perfect match, different as no match
        return diff === 0 ? 1.0 : 0.0;
      }

      return Math.max(0, Math.min(1, 1 - diff / maxDelta));
    }

    case QuestionnaireQuestionType.DROPDOWN:
    case QuestionnaireQuestionType.RADIO_7: {
      // For single-choice questions, exact match or no match
      return valueA === valueB ? 1.0 : 0.0;
    }

    case QuestionnaireQuestionType.CHECKBOXES: {
      // For multi-select, use Jaccard similarity (intersection / union)
      const setA = new Set(valueA as string[]);
      const setB = new Set(valueB as string[]);
      const intersection = new Set([...setA].filter((x) => setB.has(x)));
      const union = new Set([...setA, ...setB]);

      // Both empty arrays = perfect agreement (100% similar)
      if (union.size === 0) {
        return 1.0;
      }

      return intersection.size / union.size;
    }

    case QuestionnaireQuestionType.TEXT: {
      // Numeric proximity scoring for TEXT:number questions.
      // If the question's options include { numericMaxDelta: N }, both values
      // are parsed as numbers and scored by distance: 1 - |a - b| / maxDelta.
      // This enables lifestyle-proximity questions (work hours, screen time)
      // to be scored without converting their DB type to NUMBER_SCALE.
      const opts = question.options as Record<string, unknown> | null;
      const maxDelta =
        opts && typeof opts["numericMaxDelta"] === "number"
          ? (opts["numericMaxDelta"] as number)
          : null;
      if (maxDelta !== null && maxDelta > 0) {
        const a = Number(valueA);
        const b = Number(valueB);
        if (!isNaN(a) && !isNaN(b)) {
          return Math.max(0, 1 - Math.abs(a - b) / maxDelta);
        }
      }
      return 0.5;
    }

    case QuestionnaireQuestionType.TEXTAREA:
    case QuestionnaireQuestionType.RICH_TEXT: {
      return 0.5;
    }

    case QuestionnaireQuestionType.POINT_ALLOCATION: {
      // Compare point allocations using normalized dot product similarity
      const allocA = (valueA as Record<string, number>) || {};
      const allocB = (valueB as Record<string, number>) || {};
      const allKeys = new Set([...Object.keys(allocA), ...Object.keys(allocB)]);

      // No keys means both empty - return neutral (not perfect match)
      if (allKeys.size === 0) return 0.5;

      let dotProduct = 0;
      let magnitudeA = 0;
      let magnitudeB = 0;

      for (const key of allKeys) {
        const a = allocA[key] || 0;
        const b = allocB[key] || 0;
        dotProduct += a * b;
        magnitudeA += a * a;
        magnitudeB += b * b;
      }

      const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
      // If one side has all zeros and the other has values, return neutral (not perfect match)
      if (magnitude === 0) return 0.5;

      return dotProduct / magnitude; // Cosine similarity (0 to 1)
    }

    case QuestionnaireQuestionType.RANKING: {
      // Compare rankings using normalized Kendall tau distance
      const rankA = (valueA as string[]) || [];
      const rankB = (valueB as string[]) || [];

      if (rankA.length === 0 || rankB.length === 0) return 0.5;
      if (rankA.length !== rankB.length) return 0.5;

      // Count concordant and discordant pairs
      let concordant = 0;
      let discordant = 0;

      const posB = new Map(rankB.map((item, idx) => [item, idx]));

      for (let i = 0; i < rankA.length; i++) {
        for (let j = i + 1; j < rankA.length; j++) {
          const posBi = posB.get(rankA[i]);
          const posBj = posB.get(rankA[j]);

          if (posBi === undefined || posBj === undefined) continue;

          // In rankA, i comes before j (i < j always true in this loop)
          // Check if same order in rankB
          if (posBi < posBj) {
            concordant++;
          } else {
            discordant++;
          }
        }
      }

      const totalPairs = concordant + discordant;
      // If no pairs could be compared (items don't overlap), return neutral
      if (totalPairs === 0) return 0.5;

      // Kendall tau: (concordant - discordant) / totalPairs ranges from -1 to 1
      // Convert to 0-1 scale
      const tau = (concordant - discordant) / totalPairs;
      return (tau + 1) / 2;
    }

    default:
      return 0.5; // Neutral for unsupported types
  }
}
