import { Applicant, Questionnaire } from "@prisma/client";
import { scoreApplicantMatch } from "./scoring";

type ApplicantWithQuestionnaire = Applicant & { questionnaire?: Questionnaire | null };

export function getRecommendations(
  applicant: ApplicantWithQuestionnaire,
  candidates: ApplicantWithQuestionnaire[],
  maxResults = 10,
) {
  const scored = candidates.map((candidate) => ({
    candidate,
    score: scoreApplicantMatch(applicant, candidate),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((entry) => ({
      applicantId: entry.candidate.id,
      compatibilityScore: entry.score,
    }));
}
