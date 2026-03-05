import { QuestionnaireQuestion } from "@prisma/client";

/**
 * Configuration for a cross-applicant question pair.
 *
 * A cross-applicant pair is two related questions where the meaningful
 * compatibility check is Person A's answer to Q1 against Person B's answer
 * to Q2 (and vice versa), rather than comparing both people's answers to the
 * same question independently.
 *
 * Example: "Do you have pets?" (status) vs
 *          "How do you feel about a partner having pets?" (preference).
 * A pet owner needs a partner who tolerates pets; a non-owner has no conflict
 * regardless of the partner's comfort level.
 */
export interface CrossPairConfig {
  name: string;
  /** Substring matching the status question (objective fact: do you have X?) */
  statusQuestionSubstring: string;
  /** Substring matching the preference question (would you date someone with X?) */
  preferenceQuestionSubstring: string;
  /**
   * Returns a 0–1 compatibility score for one direction of the pair.
   * Called as scoreOneSide(A's status answer, B's preference answer) and
   * again as scoreOneSide(B's status answer, A's preference answer).
   * The final pair score is the average of both directions.
   */
  scoreOneSide(statusAnswer: unknown, preferenceAnswer: unknown): number;
}

export interface ResolvedCrossPair {
  config: CrossPairConfig;
  statusQuestionId: string;
  statusWeight: number;
  preferenceQuestionId: string;
  preferenceWeight: number;
}

export interface CrossPairIndex {
  resolved: ResolvedCrossPair[];
  /** IDs of all questions handled by cross-pair scoring (skip in main loop) */
  coveredIds: Set<string>;
}

// ── Pair Definitions ────────────────────────────────────────────────────────

const PETS_COMFORT_MAP: Record<string, number> = {
  "Very comfortable - I love pets": 1.0,
  "Comfortable - I'm open to pets": 0.75,
  Neutral: 0.5,
  "Uncomfortable - I'd prefer no pets": 0.25,
  "Very uncomfortable - I'm allergic or cannot accommodate": 0.0,
};

const WOULD_DATE_CHILDREN_MAP: Record<string, number> = {
  Yes: 1.0,
  "It depends": 0.5,
  No: 0.0,
};

export const CROSS_APPLICANT_PAIRS: CrossPairConfig[] = [
  {
    name: "Date Spending",
    // "How much are you willing to spend on a first or second date?"
    statusQuestionSubstring: "willing to spend on a first or second date",
    // "How much are you expecting a potential partner to spend on a first or second date?"
    preferenceQuestionSubstring:
      "expecting a potential partner to spend on a first or second date",
    scoreOneSide(willingAnswer, expectedAnswer) {
      const willing = Number(willingAnswer);
      const expected = Number(expectedAnswer);
      if (isNaN(willing) || isNaN(expected)) return 0.5;
      if (expected <= 0) return 1.0; // no expectation — any amount satisfies
      if (willing >= expected) return 1.0; // meets or exceeds expectation
      return willing / expected; // proportional shortfall (0–1)
    },
  },
  {
    name: "Pets",
    statusQuestionSubstring: "Do you have pets?",
    preferenceQuestionSubstring: "How do you feel about a partner having pets?",
    scoreOneSide(statusAnswer, preferenceAnswer) {
      const hasPets = statusAnswer === "Yes";
      const comfort = PETS_COMFORT_MAP[String(preferenceAnswer)] ?? 0.5;
      if (hasPets) {
        // Partner must be comfortable living with pets
        return comfort;
      } else {
        // No pets: an uncomfortable partner is fully satisfied (1.0).
        // A pet-lover has a mild unmet preference but no active conflict (0.5).
        return 0.5 + (1 - comfort) * 0.5;
      }
    },
  },
  {
    name: "Children",
    statusQuestionSubstring: "Do you have children?",
    preferenceQuestionSubstring: "Would you date someone with children?",
    scoreOneSide(statusAnswer, preferenceAnswer) {
      const hasChildren = statusAnswer === "Yes";
      if (!hasChildren) {
        // No children: partner's willingness to date someone with children is
        // irrelevant — the preference is automatically satisfied.
        return 1.0;
      }
      return WOULD_DATE_CHILDREN_MAP[String(preferenceAnswer)] ?? 0.5;
    },
  },
];

// ── Index Builder ────────────────────────────────────────────────────────────

/**
 * Resolves cross-pair prompt substrings to actual question IDs from the
 * loaded question list. Questions whose IDs appear in `coveredIds` must be
 * skipped in the main independent-scoring loop.
 */
export function buildCrossPairIndex(
  questions: QuestionnaireQuestion[],
  pairs: CrossPairConfig[] = CROSS_APPLICANT_PAIRS,
): CrossPairIndex {
  const resolved: ResolvedCrossPair[] = [];
  const coveredIds = new Set<string>();

  for (const pair of pairs) {
    const statusQ = questions.find((q) =>
      q.prompt
        .toLowerCase()
        .includes(pair.statusQuestionSubstring.toLowerCase()),
    );
    const preferenceQ = questions.find((q) =>
      q.prompt
        .toLowerCase()
        .includes(pair.preferenceQuestionSubstring.toLowerCase()),
    );

    if (!statusQ || !preferenceQ) continue;

    resolved.push({
      config: pair,
      statusQuestionId: statusQ.id,
      statusWeight: statusQ.mlWeight,
      preferenceQuestionId: preferenceQ.id,
      preferenceWeight: preferenceQ.mlWeight,
    });
    coveredIds.add(statusQ.id);
    coveredIds.add(preferenceQ.id);
  }

  return { resolved, coveredIds };
}
