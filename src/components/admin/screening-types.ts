export type ScreeningStatus = "PENDING" | "IN_PROGRESS" | "PASSED" | "FAILED";

export type ScreeningData = {
  screeningStatus: ScreeningStatus;
  idenfyStatus: ScreeningStatus;
  idenfyVerificationId: string | null;
  checkrStatus: ScreeningStatus;
  checkrReportId: string | null;
  checkrCandidateId: string | null;
  backgroundCheckConsentAt: string | null;
  backgroundCheckConsentIp: string | null;
  backgroundCheckNotes: string | null;
  continuousMonitoringId: string | null;
};
