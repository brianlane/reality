import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => {
  const dbMock: Record<string, unknown> = {
    applicant: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    screeningAuditLog: { create: vi.fn() },
    $executeRaw: vi.fn().mockResolvedValue(0),
    $transaction: vi.fn(),
  };
  // $transaction executes the callback with the same mock, so tx.applicant.update
  // and tx.$executeRaw are captured by the same mock functions as db.*.
  (dbMock.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
    async (cb: (tx: typeof dbMock) => Promise<unknown>) => cb(dbMock),
  );
  return { db: dbMock };
});

vi.mock("@/lib/email/status", () => ({
  sendApplicationStatusEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/email/admin-notifications", () => ({
  notifyAdminCheckrFlagged: vi.fn().mockResolvedValue(undefined),
  notifyAdminMonitoringAlert: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/background-checks/checkr", () => ({
  enrollContinuousMonitoring: vi.fn(),
}));

vi.mock("@/lib/background-checks/checkr-trigger", () => ({
  triggerCheckrInvitation: vi.fn(),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeApplicant(overrides = {}) {
  return {
    id: "app-1",
    userId: "user-1",
    deletedAt: null,
    backgroundCheckConsentAt: new Date(),
    backgroundCheckConsentIp: "1.2.3.4",
    backgroundCheckNotes: null,
    applicationStatus: "SUBMITTED",
    screeningStatus: "PENDING",
    idenfyStatus: "PENDING",
    idenfyVerificationId: null,
    checkrStatus: "PENDING",
    checkrReportId: null,
    checkrCandidateId: null,
    continuousMonitoringId: null,
    user: { email: "test@example.com", firstName: "Jane", lastName: "Doe" },
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("atomicAppendNote", () => {
  let atomicAppendNote: (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    executor: { $executeRaw: any },
    applicantId: string,
    note: string,
  ) => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ atomicAppendNote } = await import("./orchestrator"));
  });

  it("calls $executeRaw with the applicant ID and note", async () => {
    const mockExecutor = { $executeRaw: vi.fn().mockResolvedValue(0) };
    await atomicAppendNote(mockExecutor, "app-1", "test note");
    expect(mockExecutor.$executeRaw).toHaveBeenCalledTimes(1);
  });
});

describe("initiateScreening", () => {
  let initiateScreening: (id: string) => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ initiateScreening } = await import("./orchestrator"));
  });

  it("throws when applicant is not found", async () => {
    const { db } = await import("@/lib/db");
    vi.mocked(db.applicant.findUnique).mockResolvedValue(null);

    await expect(initiateScreening("missing-id")).rejects.toThrow(
      "Applicant not found",
    );
  });

  it("returns early for soft-deleted applicants", async () => {
    const { db } = await import("@/lib/db");
    vi.mocked(db.applicant.findUnique).mockResolvedValue(
      makeApplicant({ deletedAt: new Date() }) as never,
    );

    await expect(initiateScreening("app-1")).resolves.toBeUndefined();
    expect(db.applicant.updateMany).not.toHaveBeenCalled();
  });

  it("throws when FCRA consent is missing", async () => {
    const { db } = await import("@/lib/db");
    vi.mocked(db.applicant.findUnique).mockResolvedValue(
      makeApplicant({ backgroundCheckConsentAt: null }) as never,
    );

    await expect(initiateScreening("app-1")).rejects.toThrow(
      "FCRA consent not provided",
    );
  });

  it("transitions SUBMITTED to SCREENING_IN_PROGRESS and sends email", async () => {
    const { db } = await import("@/lib/db");
    const { sendApplicationStatusEmail } = await import("@/lib/email/status");
    vi.mocked(db.applicant.findUnique).mockResolvedValue(
      makeApplicant() as never,
    );
    vi.mocked(db.applicant.updateMany).mockResolvedValue({ count: 1 });

    await initiateScreening("app-1");

    expect(db.applicant.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "app-1", applicationStatus: "SUBMITTED" },
        data: expect.objectContaining({
          applicationStatus: "SCREENING_IN_PROGRESS",
        }),
      }),
    );
    expect(sendApplicationStatusEmail).toHaveBeenCalled();
  });

  it("does not send email when updateMany matches 0 rows (already progressed)", async () => {
    const { db } = await import("@/lib/db");
    const { sendApplicationStatusEmail } = await import("@/lib/email/status");
    vi.mocked(db.applicant.findUnique).mockResolvedValue(
      makeApplicant({ applicationStatus: "APPROVED" }) as never,
    );
    vi.mocked(db.applicant.updateMany).mockResolvedValue({ count: 0 });

    await initiateScreening("app-1");

    expect(sendApplicationStatusEmail).not.toHaveBeenCalled();
  });
});

describe("onIdenfyComplete", () => {
  let onIdenfyComplete: (
    id: string,
    status: "PASSED" | "FAILED" | "IN_PROGRESS",
  ) => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ onIdenfyComplete } = await import("./orchestrator"));
  });

  it("returns early for IN_PROGRESS status without DB access", async () => {
    const { db } = await import("@/lib/db");
    await onIdenfyComplete("app-1", "IN_PROGRESS");
    expect(db.applicant.findUnique).not.toHaveBeenCalled();
  });

  it("marks screening FAILED when iDenfy fails (using atomic note append)", async () => {
    const { db } = await import("@/lib/db");
    vi.mocked(db.applicant.findUnique).mockResolvedValue(
      makeApplicant() as never,
    );
    vi.mocked(db.applicant.update).mockResolvedValue({} as never);

    await onIdenfyComplete("app-1", "FAILED");

    // Uses $transaction for atomic status + note update
    expect(db.$transaction).toHaveBeenCalled();
    expect(db.applicant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ screeningStatus: "FAILED" }),
      }),
    );
    expect(db.$executeRaw).toHaveBeenCalled();
  });

  it("triggers Checkr when iDenfy passes", async () => {
    const { db } = await import("@/lib/db");
    const { triggerCheckrInvitation } =
      await import("@/lib/background-checks/checkr-trigger");
    vi.mocked(db.applicant.findUnique).mockResolvedValue(
      makeApplicant() as never,
    );
    vi.mocked(triggerCheckrInvitation).mockResolvedValue({
      status: "invitation_sent",
      candidateId: "cand-1",
      invitationId: "inv-1",
      packageName: "essential_criminal",
    });

    await onIdenfyComplete("app-1", "PASSED");

    expect(triggerCheckrInvitation).toHaveBeenCalledWith(
      expect.objectContaining({
        applicantId: "app-1",
        audit: expect.objectContaining({ action: "CHECKR_AUTO_TRIGGERED" }),
      }),
    );
  });
});

describe("onCheckrComplete", () => {
  let onCheckrComplete: (
    id: string,
    status: "PASSED" | "FAILED",
    result: string | null,
  ) => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ onCheckrComplete } = await import("./orchestrator"));
  });

  it("marks screening FAILED and notifies admin when result is non-clear", async () => {
    const { db } = await import("@/lib/db");
    const { notifyAdminCheckrFlagged } =
      await import("@/lib/email/admin-notifications");
    vi.mocked(db.applicant.findUnique).mockResolvedValue(
      makeApplicant({ checkrStatus: "IN_PROGRESS" }) as never,
    );
    vi.mocked(db.applicant.update).mockResolvedValue({} as never);

    await onCheckrComplete("app-1", "FAILED", "consider");

    // Uses $transaction for atomic status + note update
    expect(db.$transaction).toHaveBeenCalled();
    expect(db.applicant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ screeningStatus: "FAILED" }),
      }),
    );
    expect(db.$executeRaw).toHaveBeenCalled();
    expect(notifyAdminCheckrFlagged).toHaveBeenCalledWith(
      expect.objectContaining({ applicantId: "app-1", result: "consider" }),
    );
  });

  it("returns early for soft-deleted applicants", async () => {
    const { db } = await import("@/lib/db");
    vi.mocked(db.applicant.findUnique).mockResolvedValue(
      makeApplicant({ deletedAt: new Date() }) as never,
    );

    await onCheckrComplete("app-1", "PASSED", "clear");

    expect(db.applicant.update).not.toHaveBeenCalled();
  });
});
