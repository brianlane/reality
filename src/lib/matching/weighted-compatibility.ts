import { db } from "@/lib/db";
import {
  QuestionnaireQuestion,
  QuestionnaireQuestionType,
} from "@prisma/client";

export interface QuestionBreakdown {
  questionId: string;
  prompt: string;
  similarity: number;
  weight: number;
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

  const dealbreakersViolated: string[] = [];
  const breakdown: QuestionBreakdown[] = [];
  let totalWeightedScore = 0;
  let totalWeight = 0;

  // 2. For each question, calculate weighted score
  for (const question of questions) {
    const answerA = question.answers.find((a) => a.applicantId === applicantId);
    const answerB = question.answers.find((a) => a.applicantId === candidateId);

    // Skip if either didn't answer OR if either value is null
    if (
      !answerA ||
      !answerB ||
      answerA.value === null ||
      answerB.value === null
    )
      continue;

    // Calculate similarity based on question type
    const similarity = calculateSimilarity(
      question,
      answerA.value,
      answerB.value,
    );

    const isDealbreakerQuestion = question.isDealbreaker;

    // Check dealbreaker - collect all violations, don't return immediately
    if (isDealbreakerQuestion && similarity < 0.5) {
      dealbreakersViolated.push(question.id);
    }

    // Apply weight
    const weightedScore = similarity * question.mlWeight;
    totalWeightedScore += weightedScore;
    totalWeight += question.mlWeight;

    breakdown.push({
      questionId: question.id,
      prompt: question.prompt,
      similarity,
      weight: question.mlWeight,
      weightedScore,
    });
  }

  // 3. Calculate final score (weighted average)
  let score =
    totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) : 50; // Default if no questions answered

  // 4. If any dealbreakers were violated, set score to 0
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

    case QuestionnaireQuestionType.TEXT:
    case QuestionnaireQuestionType.TEXTAREA:
    case QuestionnaireQuestionType.RICH_TEXT: {
      // For text fields, we could use string similarity in the future
      // For now, just return neutral (0.5)
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
