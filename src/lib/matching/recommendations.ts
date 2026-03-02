import { Applicant } from "@prisma/client";
import { scoreApplicantMatch } from "./scoring";
import { applyFilters } from "./filters";
import { locationSimilarity, LOCATION_WEIGHT } from "./weighted-compatibility";

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

  // 2. Score all filtered candidates, applying the same location proximity bonus
  //    used in all_pairs mode so scores are consistent across match modes.
  const scored = await Promise.all(
    filtered.map(async (candidate) => {
      const result = await scoreApplicantMatch(applicant, candidate);
      let adjustedScore = result.score;
      if (
        result.dealbreakersViolated.length === 0 &&
        applicant.location &&
        candidate.location
      ) {
        const locSim = locationSimilarity(
          applicant.location,
          candidate.location,
        );
        adjustedScore = Math.round(
          result.score * (1 - LOCATION_WEIGHT) + locSim * 100 * LOCATION_WEIGHT,
        );
      }
      return { candidate, result, adjustedScore };
    }),
  );

  // 3. Filter out dealbreaker violations first (absolute exclusions)
  // Dealbreakers cannot be overridden by minScore parameter
  const withoutDealbreakers = scored.filter(
    (s) => s.result.dealbreakersViolated.length === 0,
  );

  // 4. Filter by minimum score
  const qualifying = withoutDealbreakers.filter(
    (s) => s.adjustedScore >= minScore,
  );

  // 5. Sort by score (descending)
  qualifying.sort((a, b) => b.adjustedScore - a.adjustedScore);

  // 6. Return top N recommendations
  return qualifying.slice(0, maxResults).map((s) => ({
    applicantId: s.candidate.id,
    compatibilityScore: s.adjustedScore,
    dealbreakersViolated: s.result.dealbreakersViolated,
    questionsScored: s.result.questionsScored,
  }));
}
