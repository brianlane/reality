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

    // Check dealbreaker - if mismatch on dealbreaker question, return 0 immediately
    if (question.isDealbreaker && similarity < 0.5) {
      dealbreakersViolated.push(question.id);
      // Return immediately with score 0
      return {
        score: 0,
        dealbreakersViolated,
        questionsScored: 0,
        breakdown: [
          {
            questionId: question.id,
            prompt: question.prompt,
            similarity,
            weight: question.mlWeight,
            weightedScore: 0,
          },
        ],
      };
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
  const score =
    totalWeight > 0 ? Math.round((totalWeightedScore / totalWeight) * 100) : 50; // Default if no questions answered

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
      const options = question.options as { min: number; max: number };
      const diff = Math.abs(Number(valueA) - Number(valueB));
      const maxDelta = options.max - options.min;

      // Handle division by zero (misconfigured question where min === max)
      if (maxDelta === 0) {
        // If range is 0, treat same values as perfect match, different as no match
        return diff === 0 ? 1.0 : 0.0;
      }

      return Math.max(0, 1 - diff / maxDelta);
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
      return union.size > 0 ? intersection.size / union.size : 0;
    }

    case QuestionnaireQuestionType.TEXT:
    case QuestionnaireQuestionType.TEXTAREA:
    case QuestionnaireQuestionType.RICH_TEXT: {
      // For text fields, we could use string similarity in the future
      // For now, just return neutral (0.5)
      return 0.5;
    }

    default:
      return 0.5; // Neutral for unsupported types
  }
}
