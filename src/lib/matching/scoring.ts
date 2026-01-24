import { Applicant, Questionnaire } from "@prisma/client";
import { calculateWeightedCompatibility } from "./weighted-compatibility";
import { calculateCompatibility } from "./compatibility";

type ApplicantWithQuestionnaire = Applicant & {
  questionnaire?: Questionnaire | null;
};

/**
 * Score a match between two applicants using weighted compatibility algorithm
 * Falls back to old algorithm if weighted scoring fails
 */
export async function scoreApplicantMatch(
  applicant: ApplicantWithQuestionnaire,
  candidate: ApplicantWithQuestionnaire,
) {
  try {
    // Use new weighted compatibility algorithm
    return await calculateWeightedCompatibility(applicant.id, candidate.id);
  } catch (error) {
    console.error("Weighted compatibility failed, falling back:", error);

    // Fallback to old algorithm
    const score = calculateCompatibility(
      applicant.questionnaire ?? undefined,
      candidate.questionnaire ?? undefined,
    );

    return {
      score,
      dealbreakersViolated: [],
      questionsScored: 0,
      breakdown: [],
    };
  }
}
