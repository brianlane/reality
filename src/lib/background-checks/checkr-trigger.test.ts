import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    applicant: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    screeningAuditLog: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/background-checks/checkr", () => ({
  createCandidate: vi.fn(),
  createInvitation: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

const defaultParams = {
  applicantId: "app-1",
  applicantIdentity: {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
  },
  audit: {
    userId: "user-1",
    action: "CHECKR_INVITATION_SENT",
    metadata: { triggeredBy: "admin" },
  },
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("triggerCheckrInvitation", () => {
  let triggerCheckrInvitation: (
    params: typeof defaultParams,
  ) => Promise<unknown>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ triggerCheckrInvitation } = await import("./checkr-trigger"));
  });

  it("returns already_in_progress when checkrStatus is not PENDING or FAILED", async () => {
    const { db } = await import("@/lib/db");
    vi.mocked(db.applicant.updateMany).mockResolvedValue({ count: 0 });

    const result = await triggerCheckrInvitation(defaultParams);

    expect(result).toEqual({ status: "already_in_progress" });
    expect(db.screeningAuditLog.create).not.toHaveBeenCalled();
  });

  it("claims from FAILED status and sends invitation", async () => {
    const { db } = await import("@/lib/db");
    const { createInvitation } = await import("@/lib/background-checks/checkr");
    vi.mocked(db.applicant.updateMany)
      .mockResolvedValueOnce({ count: 1 }) // claimedFromFailed
      .mockResolvedValue({ count: 0 });
    vi.mocked(db.applicant.findUnique).mockResolvedValue({
      checkrCandidateId: "cand-1",
    } as never);
    vi.mocked(db.screeningAuditLog.create).mockResolvedValue({
      id: "audit-1",
    } as never);
    vi.mocked(db.screeningAuditLog.update).mockResolvedValue({} as never);
    vi.mocked(createInvitation).mockResolvedValue({ id: "inv-1" } as never);

    const result = await triggerCheckrInvitation(defaultParams);

    expect(result).toMatchObject({
      status: "invitation_sent",
      candidateId: "cand-1",
      invitationId: "inv-1",
    });
  });

  it("claims from PENDING status when not FAILED", async () => {
    const { db } = await import("@/lib/db");
    const { createInvitation } = await import("@/lib/background-checks/checkr");
    vi.mocked(db.applicant.updateMany)
      .mockResolvedValueOnce({ count: 0 }) // claimedFromFailed
      .mockResolvedValueOnce({ count: 1 }); // claimedFromPending
    vi.mocked(db.applicant.findUnique).mockResolvedValue({
      checkrCandidateId: "cand-1",
    } as never);
    vi.mocked(db.screeningAuditLog.create).mockResolvedValue({
      id: "audit-1",
    } as never);
    vi.mocked(db.screeningAuditLog.update).mockResolvedValue({} as never);
    vi.mocked(createInvitation).mockResolvedValue({ id: "inv-1" } as never);

    const result = await triggerCheckrInvitation(defaultParams);

    expect(result).toMatchObject({ status: "invitation_sent" });
  });

  it("creates a new Checkr candidate when none exists", async () => {
    const { db } = await import("@/lib/db");
    const { createCandidate, createInvitation } =
      await import("@/lib/background-checks/checkr");
    vi.mocked(db.applicant.updateMany).mockResolvedValueOnce({ count: 1 });
    vi.mocked(db.applicant.findUnique).mockResolvedValue({
      checkrCandidateId: null,
    } as never);
    vi.mocked(db.applicant.update).mockResolvedValue({} as never);
    vi.mocked(createCandidate).mockResolvedValue({ id: "new-cand" } as never);
    vi.mocked(db.screeningAuditLog.create).mockResolvedValue({
      id: "audit-1",
    } as never);
    vi.mocked(db.screeningAuditLog.update).mockResolvedValue({} as never);
    vi.mocked(createInvitation).mockResolvedValue({ id: "inv-1" } as never);

    await triggerCheckrInvitation(defaultParams);

    expect(createCandidate).toHaveBeenCalledWith({
      firstName: "Jane",
      lastName: "Doe",
      email: "jane@example.com",
    });
    expect(db.applicant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { checkrCandidateId: "new-cand" },
      }),
    );
  });

  it("writes audit log BEFORE sending invitation (within rollback territory)", async () => {
    const { db } = await import("@/lib/db");
    const { createInvitation } = await import("@/lib/background-checks/checkr");
    const callOrder: string[] = [];

    vi.mocked(db.applicant.updateMany).mockResolvedValueOnce({ count: 1 });
    vi.mocked(db.applicant.findUnique).mockResolvedValue({
      checkrCandidateId: "cand-1",
    } as never);
    vi.mocked(db.screeningAuditLog.create).mockImplementation((async () => {
      callOrder.push("audit_create");
      return { id: "audit-1" };
    }) as never);
    vi.mocked(createInvitation).mockImplementation((async () => {
      callOrder.push("invitation_sent");
      return { id: "inv-1" };
    }) as never);
    vi.mocked(db.screeningAuditLog.update).mockResolvedValue({} as never);

    await triggerCheckrInvitation(defaultParams);

    expect(callOrder).toEqual(["audit_create", "invitation_sent"]);
  });

  it("rolls back checkrStatus and rethrows when audit log write fails (bug fix: retry remains possible)", async () => {
    const { db } = await import("@/lib/db");
    vi.mocked(db.applicant.updateMany).mockResolvedValueOnce({ count: 1 });
    vi.mocked(db.applicant.findUnique).mockResolvedValue({
      checkrCandidateId: "cand-1",
    } as never);
    vi.mocked(db.screeningAuditLog.create).mockRejectedValue(
      new Error("DB connection lost"),
    );

    await expect(triggerCheckrInvitation(defaultParams)).rejects.toThrow(
      "DB connection lost",
    );

    // Status must be rolled back so the next retry can claim and try again
    expect(db.applicant.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: "app-1", checkrStatus: "IN_PROGRESS" },
        data: { checkrStatus: "FAILED" },
      }),
    );
  });

  it("rolls back checkrStatus and rethrows when createInvitation fails", async () => {
    const { db } = await import("@/lib/db");
    const { createInvitation } = await import("@/lib/background-checks/checkr");
    vi.mocked(db.applicant.updateMany).mockResolvedValueOnce({ count: 1 });
    vi.mocked(db.applicant.findUnique).mockResolvedValue({
      checkrCandidateId: "cand-1",
    } as never);
    vi.mocked(db.screeningAuditLog.create).mockResolvedValue({
      id: "audit-1",
    } as never);
    vi.mocked(createInvitation).mockRejectedValue(
      new Error("Checkr API timeout"),
    );

    await expect(triggerCheckrInvitation(defaultParams)).rejects.toThrow(
      "Checkr API timeout",
    );

    expect(db.applicant.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: "app-1", checkrStatus: "IN_PROGRESS" },
        data: { checkrStatus: "FAILED" },
      }),
    );
  });

  it("reuses existing checkrCandidateId on re-trigger (does not create duplicate candidate)", async () => {
    const { db } = await import("@/lib/db");
    const { createCandidate, createInvitation } =
      await import("@/lib/background-checks/checkr");
    // Claim from FAILED (re-trigger scenario)
    vi.mocked(db.applicant.updateMany).mockResolvedValueOnce({ count: 1 });
    // Applicant already has a candidateId from the previous attempt
    vi.mocked(db.applicant.findUnique).mockResolvedValue({
      checkrCandidateId: "existing-cand",
    } as never);
    vi.mocked(db.screeningAuditLog.create).mockResolvedValue({
      id: "audit-1",
    } as never);
    vi.mocked(db.screeningAuditLog.update).mockResolvedValue({} as never);
    vi.mocked(createInvitation).mockResolvedValue({ id: "inv-2" } as never);

    const result = await triggerCheckrInvitation(defaultParams);

    // Must reuse the existing candidate — no new candidate created
    expect(createCandidate).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "invitation_sent",
      candidateId: "existing-cand",
      invitationId: "inv-2",
    });
  });

  it("enriches audit log with invitationId after successful invitation", async () => {
    const { db } = await import("@/lib/db");
    const { createInvitation } = await import("@/lib/background-checks/checkr");
    vi.mocked(db.applicant.updateMany).mockResolvedValueOnce({ count: 1 });
    vi.mocked(db.applicant.findUnique).mockResolvedValue({
      checkrCandidateId: "cand-1",
    } as never);
    vi.mocked(db.screeningAuditLog.create).mockResolvedValue({
      id: "audit-1",
    } as never);
    vi.mocked(createInvitation).mockResolvedValue({
      id: "inv-1",
      package: "essential_criminal",
    } as never);
    vi.mocked(db.screeningAuditLog.update).mockResolvedValue({} as never);

    await triggerCheckrInvitation(defaultParams);

    // Allow the fire-and-forget update to settle
    await new Promise((r) => setTimeout(r, 0));

    expect(db.screeningAuditLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "audit-1" },
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            invitationId: "inv-1",
            candidateId: "cand-1",
          }),
        }),
      }),
    );
  });
});
