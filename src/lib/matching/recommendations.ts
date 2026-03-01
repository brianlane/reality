import { Applicant } from "@prisma/client";
import { scoreApplicantMatch } from "./scoring";
import { applyFilters } from "./filters";

type ApplicantWithQuestionnaire = Applicant;

export interface RecommendationOptions {
  maxResults?: number;
  minScore?: number;
}

export interface Recommendation {
  applicantId: string;
  compatibilityScore: number;
  dealbreakersViolated: string[];
  questionsScored: number;
}

/**
 * Get recommended matches for an applicant
 * Applies filters first, then scores and sorts candidates
 */
export async function getRecommendations(
  applicant: ApplicantWithQuestionnaire,
  candidates: ApplicantWithQuestionnaire[],
  options?: RecommendationOptions,
): Promise<Recommendation[]> {
  const maxResults = options?.maxResults ?? 10;
  const minScore = options?.minScore ?? 50;

  // 1. Apply pre-filters (gender/seeking/status)
  const filtered = applyFilters(applicant, candidates);

  // 2. Score all filtered candidates
  const scored = await Promise.all(
    filtered.map(async (candidate) => {
      const result = await scoreApplicantMatch(applicant, candidate);
      return {
        candidate,
        result,
      };
    }),
  );

  // 3. Filter out dealbreaker violations first (absolute exclusions)
  // Dealbreakers cannot be overridden by minScore parameter
  const withoutDealbreakers = scored.filter(
    (s) => s.result.dealbreakersViolated.length === 0,
  );

  // 4. Filter by minimum score
  const qualifying = withoutDealbreakers.filter(
    (s) => s.result.score >= minScore,
  );

  // 5. Sort by score (descending)
  qualifying.sort((a, b) => b.result.score - a.result.score);

  // 6. Return top N recommendations
  return qualifying.slice(0, maxResults).map((s) => ({
    applicantId: s.candidate.id,
    compatibilityScore: s.result.score,
    dealbreakersViolated: s.result.dealbreakersViolated,
    questionsScored: s.result.questionsScored,
  }));
}
