import { describe, expect, it } from "vitest";
import {
  ApplicationStatus,
  FlagSeverity,
  Gender,
  ScreeningStatus,
  type Applicant,
} from "@prisma/client";
import { checkScreeningFlags, filterByStatus } from "./filters";

function makeApplicant(overrides: Partial<Applicant> = {}): Applicant {
  return {
    id: "applicant-1",
    userId: "user-1",
    age: 30,
    gender: Gender.MAN,
    seeking: Gender.WOMAN,
    location: "Phoenix, AZ",
    cityFrom: null,
    industry: null,
    occupation: "Engineer",
    employer: null,
    education: "College",
    incomeRange: "100k-150k",
    incomeVerified: false,
    referredBy: null,
    aboutYourself: null,
    stage1CompletedAt: null,
    stage1Responses: null,
    waitlistedAt: null,
    waitlistReason: null,
    waitlistPosition: null,
    invitedOffWaitlistAt: null,
    invitedOffWaitlistBy: null,
    waitlistInviteToken: null,
    researchInviteCode: null,
    researchInvitedAt: null,
    researchInvitedBy: null,
    researchInviteUsedAt: null,
    researchCompletedAt: null,
    prolificPid: null,
    prolificStudyId: null,
    prolificSessionId: null,
    prolificPartnerPid: null,
    prolificCompletionCode: null,
    prolificRedirectedAt: null,
    applicationStatus: ApplicationStatus.APPROVED,
    submittedAt: null,
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    softRejectedAt: null,
    softRejectedFromStatus: null,
    screeningStatus: ScreeningStatus.PASSED,
    idenfyStatus: ScreeningStatus.PENDING,
    idenfyVerificationId: null,
    checkrStatus: ScreeningStatus.PENDING,
    checkrReportId: null,
    backgroundCheckNotes: null,
    backgroundCheckConsentAt: null,
    backgroundCheckConsentIp: null,
    checkrCandidateId: null,
    continuousMonitoringId: null,
    relationshipReadinessFlag: null,
    saScreeningFlag: null,
    screeningFlagDetails: null,
    screeningFlagComputedAt: null,
    screeningFlagReviewedAt: null,
    screeningFlagReviewedBy: null,
    screeningFlagOverride: false,
    compatibilityScore: null,
    photos: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  };
}

describe("checkScreeningFlags", () => {
  it("returns exclusion for RED SA flag", () => {
    const applicant = makeApplicant({ saScreeningFlag: FlagSeverity.RED });
    const result = checkScreeningFlags(applicant);
    expect(result).not.toBeNull();
    expect(result?.flag).toBe("saRisk");
    expect(result?.severity).toBe(FlagSeverity.RED);
  });

  it("returns exclusion for RED relationship readiness flag", () => {
    const applicant = makeApplicant({
      relationshipReadinessFlag: FlagSeverity.RED,
    });
    const result = checkScreeningFlags(applicant);
    expect(result).not.toBeNull();
    expect(result?.flag).toBe("relationshipReadiness");
  });

  it("returns null when override is enabled", () => {
    const applicant = makeApplicant({
      saScreeningFlag: FlagSeverity.RED,
      screeningFlagOverride: true,
    });
    expect(checkScreeningFlags(applicant)).toBeNull();
  });

  it("returns null for non-RED flags", () => {
    const applicant = makeApplicant({
      relationshipReadinessFlag: FlagSeverity.YELLOW,
      saScreeningFlag: FlagSeverity.GREEN,
    });
    expect(checkScreeningFlags(applicant)).toBeNull();
  });
});

describe("filterByStatus", () => {
  it("passes only APPROVED + PASSED + not deleted", () => {
    expect(filterByStatus(makeApplicant())).toBe(true);
    expect(
      filterByStatus(
        makeApplicant({ applicationStatus: ApplicationStatus.SUBMITTED }),
      ),
    ).toBe(false);
    expect(
      filterByStatus(
        makeApplicant({ screeningStatus: ScreeningStatus.IN_PROGRESS }),
      ),
    ).toBe(false);
    expect(filterByStatus(makeApplicant({ deletedAt: new Date() }))).toBe(
      false,
    );
  });
});
