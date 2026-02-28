import { Applicant } from "@prisma/client";
import { calculateWeightedCompatibility } from "./weighted-compatibility";

type ApplicantWithQuestionnaire = Applicant;

/**
 * Score a match between two applicants using weighted compatibility algorithm
 * Throws error if scoring fails (no silent fallback to preserve dealbreaker info)
 */
export async function scoreApplicantMatch(
  applicant: ApplicantWithQuestionnaire,
  candidate: ApplicantWithQuestionnaire,
) {
  // Use weighted compatibility algorithm
  // If this fails, we throw the error rather than silently falling back
  // because the fallback loses critical dealbreaker violation information
  return await calculateWeightedCompatibility(applicant.id, candidate.id);
}
