import {
  Applicant,
  ApplicationStatus,
  FlagSeverity,
  ScreeningStatus,
} from "@prisma/client";

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

export interface FlaggedExclusion {
  applicantId: string;
  reason: string;
  flag: "relationshipReadiness" | "saRisk";
  severity: FlagSeverity;
}

/**
 * Minimal shape required by checkScreeningFlags — allows passing DB `select`
 * results without needing the full Applicant type.
 */
export interface ScreeningFlagCandidate {
  id: string;
  screeningFlagOverride: boolean;
  saScreeningFlag: FlagSeverity | null;
  relationshipReadinessFlag: FlagSeverity | null;
}

/**
 * Check if an applicant should be excluded from matching due to RED screening flags.
 * Returns null if the applicant passes, or a FlaggedExclusion if they should be excluded.
 * Applicants with screeningFlagOverride = true are never excluded.
 */
export function checkScreeningFlags(
  candidate: ScreeningFlagCandidate,
): FlaggedExclusion | null {
  if (candidate.screeningFlagOverride) return null;

  // SA risk is checked first. If an applicant has BOTH flags RED, only the
  // SA exclusion is returned — the exclusion still takes effect regardless,
  // and the admin can see all flags on the application detail page.
  if (candidate.saScreeningFlag === FlagSeverity.RED) {
    return {
      applicantId: candidate.id,
      reason: "RED SA screening flag — requires admin override to include",
      flag: "saRisk",
      severity: FlagSeverity.RED,
    };
  }

  if (candidate.relationshipReadinessFlag === FlagSeverity.RED) {
    return {
      applicantId: candidate.id,
      reason:
        "RED relationship readiness flag — requires admin override to include",
      flag: "relationshipReadiness",
      severity: FlagSeverity.RED,
    };
  }

  return null;
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
