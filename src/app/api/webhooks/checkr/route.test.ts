import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    applicant: { findFirst: vi.fn(), updateMany: vi.fn() },
    screeningAuditLog: { create: vi.fn() },
  },
}));

vi.mock("@/lib/background-checks/checkr", () => ({
  verifyCheckrSignature: vi.fn(),
  mapCheckrResult: vi.fn(),
}));

vi.mock("@/lib/background-checks/orchestrator", () => ({
  onCheckrComplete: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/email/admin-notifications", () => ({
  notifyAdminMonitoringAlert: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeApplicant(overrides = {}) {
  return {
    id: "app-1",
    userId: "user-1",
    deletedAt: null,
    checkrCandidateId: "cand-1",
    checkrReportId: null,
    ...overrides,
  };
}

function makeRequest(body: unknown, signature = "valid-sig"): Request {
  return new Request("http://localhost/api/webhooks/checkr", {
    method: "POST",
    headers: { "x-checkr-signature": signature },
    body: JSON.stringify(body),
  });
}

function makeReportCompletedEvent(overrides = {}) {
  return {
    type: "report.completed",
    data: {
      object: {
        id: "report-1",
        candidate_id: "cand-1",
        result: "clear",
        status: "complete",
        ...overrides,
      },
    },
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/webhooks/checkr", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Signature verification ──────────────────────────────────────────────────

  it("returns 403 when signature verification throws", async () => {
    const { verifyCheckrSignature } =
      await import("@/lib/background-checks/checkr");
    vi.mocked(verifyCheckrSignature).mockImplementation(() => {
      throw new Error("Missing webhook secret");
    });

    const res = await POST(makeRequest(makeReportCompletedEvent()));
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error?.message).toContain("Missing webhook secret");
  });

  it("returns 403 when signature is invalid", async () => {
    const { verifyCheckrSignature } =
      await import("@/lib/background-checks/checkr");
    vi.mocked(verifyCheckrSignature).mockReturnValue(false);

    const res = await POST(makeRequest(makeReportCompletedEvent(), "bad-sig"));
    expect(res.status).toBe(403);
  });

  // ── Payload validation ──────────────────────────────────────────────────────

  it("returns 400 for missing event type", async () => {
    const { verifyCheckrSignature } =
      await import("@/lib/background-checks/checkr");
    vi.mocked(verifyCheckrSignature).mockReturnValue(true);

    const res = await POST(
      makeRequest({ data: { object: { id: "report-1" } } }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON payload", async () => {
    const { verifyCheckrSignature } =
      await import("@/lib/background-checks/checkr");
    vi.mocked(verifyCheckrSignature).mockReturnValue(true);

    const req = new Request("http://localhost/api/webhooks/checkr", {
      method: "POST",
      headers: { "x-checkr-signature": "valid-sig" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // ── report.completed ────────────────────────────────────────────────────────

  it("processes report.completed successfully", async () => {
    const { verifyCheckrSignature, mapCheckrResult } =
      await import("@/lib/background-checks/checkr");
    const { db } = await import("@/lib/db");
    const { onCheckrComplete } =
      await import("@/lib/background-checks/orchestrator");
    vi.mocked(verifyCheckrSignature).mockReturnValue(true);
    vi.mocked(mapCheckrResult).mockReturnValue("PASSED");
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant() as never,
    );
    vi.mocked(db.screeningAuditLog.create).mockResolvedValue({} as never);
    vi.mocked(db.applicant.updateMany).mockResolvedValue({ count: 1 });

    const res = await POST(makeRequest(makeReportCompletedEvent()));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.processed).toBe(true);
    expect(onCheckrComplete).toHaveBeenCalledWith("app-1", "PASSED", "clear");
  });

  it("returns 400 for report.completed missing reportId", async () => {
    const { verifyCheckrSignature } =
      await import("@/lib/background-checks/checkr");
    vi.mocked(verifyCheckrSignature).mockReturnValue(true);

    const res = await POST(
      makeRequest({
        type: "report.completed",
        data: { object: { candidate_id: "cand-1", result: "clear" } },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for report.completed missing candidateId", async () => {
    const { verifyCheckrSignature } =
      await import("@/lib/background-checks/checkr");
    vi.mocked(verifyCheckrSignature).mockReturnValue(true);

    const res = await POST(
      makeRequest({
        type: "report.completed",
        data: { object: { id: "report-1", result: "clear" } },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 200 processed=false when applicant not found", async () => {
    const { verifyCheckrSignature, mapCheckrResult } =
      await import("@/lib/background-checks/checkr");
    const { db } = await import("@/lib/db");
    vi.mocked(verifyCheckrSignature).mockReturnValue(true);
    vi.mocked(mapCheckrResult).mockReturnValue("PASSED");
    vi.mocked(db.applicant.findFirst).mockResolvedValue(null);

    const res = await POST(makeRequest(makeReportCompletedEvent()));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.processed).toBe(false);
  });

  it("returns 200 processed=false for idempotent retry (same reportId)", async () => {
    const { verifyCheckrSignature, mapCheckrResult } =
      await import("@/lib/background-checks/checkr");
    const { db } = await import("@/lib/db");
    const { onCheckrComplete } =
      await import("@/lib/background-checks/orchestrator");
    vi.mocked(verifyCheckrSignature).mockReturnValue(true);
    vi.mocked(mapCheckrResult).mockReturnValue("PASSED");
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant() as never,
    );
    vi.mocked(db.screeningAuditLog.create).mockResolvedValue({} as never);
    // updateMany returns 0 = report already recorded (idempotent retry)
    vi.mocked(db.applicant.updateMany).mockResolvedValue({ count: 0 });

    const res = await POST(makeRequest(makeReportCompletedEvent()));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.processed).toBe(false);
    expect(onCheckrComplete).not.toHaveBeenCalled();
  });

  it("logs audit but skips status update for soft-deleted applicant", async () => {
    const { verifyCheckrSignature, mapCheckrResult } =
      await import("@/lib/background-checks/checkr");
    const { db } = await import("@/lib/db");
    const { onCheckrComplete } =
      await import("@/lib/background-checks/orchestrator");
    vi.mocked(verifyCheckrSignature).mockReturnValue(true);
    vi.mocked(mapCheckrResult).mockReturnValue("PASSED");
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant({ deletedAt: new Date() }) as never,
    );
    vi.mocked(db.screeningAuditLog.create).mockResolvedValue({} as never);

    const res = await POST(makeRequest(makeReportCompletedEvent()));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.processed).toBe(false);
    // Audit log must still be written for compliance
    expect(db.screeningAuditLog.create).toHaveBeenCalled();
    // Status update and orchestration must be skipped
    expect(db.applicant.updateMany).not.toHaveBeenCalled();
    expect(onCheckrComplete).not.toHaveBeenCalled();
  });

  it("returns 500 when orchestrator throws", async () => {
    const { verifyCheckrSignature, mapCheckrResult } =
      await import("@/lib/background-checks/checkr");
    const { db } = await import("@/lib/db");
    const { onCheckrComplete } =
      await import("@/lib/background-checks/orchestrator");
    vi.mocked(verifyCheckrSignature).mockReturnValue(true);
    vi.mocked(mapCheckrResult).mockReturnValue("PASSED");
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant() as never,
    );
    vi.mocked(db.screeningAuditLog.create).mockResolvedValue({} as never);
    vi.mocked(db.applicant.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(onCheckrComplete).mockRejectedValue(new Error("DB error"));

    const res = await POST(makeRequest(makeReportCompletedEvent()));
    expect(res.status).toBe(500);
  });

  // ── invitation.completed ────────────────────────────────────────────────────

  it("processes invitation.completed and logs audit", async () => {
    const { verifyCheckrSignature } =
      await import("@/lib/background-checks/checkr");
    const { db } = await import("@/lib/db");
    vi.mocked(verifyCheckrSignature).mockReturnValue(true);
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant() as never,
    );
    vi.mocked(db.screeningAuditLog.create).mockResolvedValue({} as never);

    const res = await POST(
      makeRequest({
        type: "invitation.completed",
        data: { object: { id: "inv-1", candidate_id: "cand-1" } },
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.processed).toBe(true);
    expect(db.screeningAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CHECKR_INVITATION_COMPLETED",
        }),
      }),
    );
  });

  it("returns 200 processed=false for invitation.completed when applicant not found", async () => {
    const { verifyCheckrSignature } =
      await import("@/lib/background-checks/checkr");
    const { db } = await import("@/lib/db");
    vi.mocked(verifyCheckrSignature).mockReturnValue(true);
    vi.mocked(db.applicant.findFirst).mockResolvedValue(null);

    const res = await POST(
      makeRequest({
        type: "invitation.completed",
        data: { object: { id: "inv-1", candidate_id: "cand-1" } },
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.processed).toBe(false);
  });

  // ── continuous_monitor.updated ──────────────────────────────────────────────

  it("processes continuous_monitor.updated and notifies admin", async () => {
    const { verifyCheckrSignature } =
      await import("@/lib/background-checks/checkr");
    const { db } = await import("@/lib/db");
    const { notifyAdminMonitoringAlert } =
      await import("@/lib/email/admin-notifications");
    vi.mocked(verifyCheckrSignature).mockReturnValue(true);
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant() as never,
    );
    vi.mocked(db.screeningAuditLog.create).mockResolvedValue({} as never);

    const res = await POST(
      makeRequest({
        type: "continuous_monitor.updated",
        data: {
          object: {
            id: "monitor-1",
            candidate_id: "cand-1",
            status: "pending",
          },
        },
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.processed).toBe(true);
    expect(db.screeningAuditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "CONTINUOUS_MONITOR_ALERT" }),
      }),
    );
    expect(notifyAdminMonitoringAlert).toHaveBeenCalled();
  });

  it("returns 200 processed=false for continuous_monitor.updated with null candidate_id", async () => {
    const { verifyCheckrSignature } =
      await import("@/lib/background-checks/checkr");
    vi.mocked(verifyCheckrSignature).mockReturnValue(true);

    const res = await POST(
      makeRequest({
        type: "continuous_monitor.updated",
        data: { object: { id: "monitor-1", status: "pending" } }, // no candidate_id
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.processed).toBe(false);
  });

  // ── Unknown event type ──────────────────────────────────────────────────────

  it("returns 200 processed=false for unknown event types", async () => {
    const { verifyCheckrSignature } =
      await import("@/lib/background-checks/checkr");
    vi.mocked(verifyCheckrSignature).mockReturnValue(true);

    const res = await POST(
      makeRequest({
        type: "candidate.created",
        data: { object: { id: "cand-1" } },
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.processed).toBe(false);
  });
});
