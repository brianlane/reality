import { Applicant, Questionnaire } from "@prisma/client";
import { calculateCompatibility } from "./compatibility";

type ApplicantWithQuestionnaire = Applicant & { questionnaire?: Questionnaire | null };

export function scoreApplicantMatch(
  applicant: ApplicantWithQuestionnaire,
  candidate: ApplicantWithQuestionnaire,
) {
  return calculateCompatibility(
    applicant.questionnaire ?? undefined,
    candidate.questionnaire ?? undefined,
  );
}
