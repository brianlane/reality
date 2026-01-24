import { Applicant, ApplicationStatus, ScreeningStatus } from "@prisma/client";

/**
 * Check if two applicants have mutual gender/seeking compatibility
 * Both must seek each other's gender for a valid match
 */
export function filterByGenderPreferences(
  applicant: Applicant,
  candidate: Applicant,
): boolean {
  // Both must have explicit seeking preferences
  // If either has null seeking, they're not ready for matching
  if (!applicant.seeking || !candidate.seeking) {
    return false;
  }

  // Check mutual compatibility
  const applicantSeeksCandidate = applicant.seeking === candidate.gender;
  const candidateSeeksApplicant = candidate.seeking === applicant.gender;

  return applicantSeeksCandidate && candidateSeeksApplicant;
}

/**
 * Check if candidate has valid application and screening status
 */
export function filterByStatus(candidate: Applicant): boolean {
  return (
    candidate.applicationStatus === ApplicationStatus.APPROVED &&
    candidate.screeningStatus === ScreeningStatus.PASSED &&
    candidate.deletedAt === null
  );
}

/**
 * Apply all filters to a list of candidates
 */
export function applyFilters(
  applicant: Applicant,
  candidates: Applicant[],
): Applicant[] {
  return candidates.filter(
    (candidate) =>
      // Don't match with self
      candidate.id !== applicant.id &&
      // Check gender preferences
      filterByGenderPreferences(applicant, candidate) &&
      // Check status
      filterByStatus(candidate),
  );
}
