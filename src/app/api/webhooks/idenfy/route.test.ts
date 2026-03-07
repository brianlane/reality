import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    applicant: { findFirst: vi.fn(), updateMany: vi.fn() },
    screeningAuditLog: { create: vi.fn() },
  },
}));

vi.mock("@/lib/background-checks/idenfy", () => ({
  verifyIdenfySignature: vi.fn(),
  mapIdenfyStatus: vi.fn(),
}));

vi.mock("@/lib/background-checks/orchestrator", () => ({
  onIdenfyComplete: vi.fn().mockResolvedValue(undefined),
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
    idenfyVerificationId: "scan-ref-1",
    idenfyStatus: "IN_PROGRESS",
    ...overrides,
  };
}

function makeRequest(body: unknown, signature = "valid-sig"): Request {
  return new Request("http://localhost/api/webhooks/idenfy", {
    method: "POST",
    headers: { "x-idenfy-signature": signature },
    body: JSON.stringify(body),
  });
}

function makeFinalWebhook(overrides = {}) {
  return {
    final: true,
    scanRef: "scan-ref-1",
    clientId: "app-1",
    status: { overall: "APPROVED" },
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/webhooks/idenfy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Signature verification ──────────────────────────────────────────────────

  it("returns 403 when signature is invalid", async () => {
    const { verifyIdenfySignature } =
      await import("@/lib/background-checks/idenfy");
    vi.mocked(verifyIdenfySignature).mockReturnValue(false);

    const res = await POST(makeRequest(makeFinalWebhook(), "bad-sig"));
    expect(res.status).toBe(403);
  });

  // ── Non-final webhooks ──────────────────────────────────────────────────────

  it("returns 200 processed=false for interim (non-final) webhooks", async () => {
    const { verifyIdenfySignature } =
      await import("@/lib/background-checks/idenfy");
    vi.mocked(verifyIdenfySignature).mockReturnValue(true);

    const res = await POST(
      makeRequest({ ...makeFinalWebhook(), final: false }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.processed).toBe(false);
  });

  // ── Payload validation ──────────────────────────────────────────────────────

  it("returns 400 when status.overall is missing", async () => {
    const { verifyIdenfySignature } =
      await import("@/lib/background-checks/idenfy");
    vi.mocked(verifyIdenfySignature).mockReturnValue(true);

    const res = await POST(makeRequest({ final: true, scanRef: "scan-ref-1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when scanRef is missing", async () => {
    const { verifyIdenfySignature } =
      await import("@/lib/background-checks/idenfy");
    vi.mocked(verifyIdenfySignature).mockReturnValue(true);

    const res = await POST(
      makeRequest({ final: true, status: { overall: "APPROVED" } }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON payload", async () => {
    const { verifyIdenfySignature } =
      await import("@/lib/background-checks/idenfy");
    vi.mocked(verifyIdenfySignature).mockReturnValue(true);

    const req = new Request("http://localhost/api/webhooks/idenfy", {
      method: "POST",
      headers: { "x-idenfy-signature": "valid-sig" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  // ── Applicant lookup ────────────────────────────────────────────────────────

  it("returns 200 processed=false when applicant not found", async () => {
    const { verifyIdenfySignature, mapIdenfyStatus } =
      await import("@/lib/background-checks/idenfy");
    const { db } = await import("@/lib/db");
    vi.mocked(verifyIdenfySignature).mockReturnValue(true);
    vi.mocked(mapIdenfyStatus).mockReturnValue("PASSED");
    vi.mocked(db.applicant.findFirst).mockResolvedValue(null);

    const res = await POST(makeRequest(makeFinalWebhook()));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.processed).toBe(false);
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it("processes a final PASSED webhook successfully", async () => {
    const { verifyIdenfySignature, mapIdenfyStatus } =
      await import("@/lib/background-checks/idenfy");
    const { db } = await import("@/lib/db");
    const { onIdenfyComplete } =
      await import("@/lib/background-checks/orchestrator");
    vi.mocked(verifyIdenfySignature).mockReturnValue(true);
    vi.mocked(mapIdenfyStatus).mockReturnValue("PASSED");
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant() as never,
    );
    vi.mocked(db.screeningAuditLog.create).mockResolvedValue({} as never);
    vi.mocked(db.applicant.updateMany).mockResolvedValue({ count: 1 });

    const res = await POST(makeRequest(makeFinalWebhook()));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.processed).toBe(true);
    expect(onIdenfyComplete).toHaveBeenCalledWith("app-1", "PASSED");
  });

  // ── Idempotency ─────────────────────────────────────────────────────────────

  it("returns 200 processed=false for idempotent retry (status already finalized)", async () => {
    const { verifyIdenfySignature, mapIdenfyStatus } =
      await import("@/lib/background-checks/idenfy");
    const { db } = await import("@/lib/db");
    const { onIdenfyComplete } =
      await import("@/lib/background-checks/orchestrator");
    vi.mocked(verifyIdenfySignature).mockReturnValue(true);
    vi.mocked(mapIdenfyStatus).mockReturnValue("PASSED");
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant() as never,
    );
    vi.mocked(db.screeningAuditLog.create).mockResolvedValue({} as never);
    // 0 rows claimed = already processed (PASSED/FAILED guard blocked it)
    vi.mocked(db.applicant.updateMany).mockResolvedValue({ count: 0 });

    const res = await POST(makeRequest(makeFinalWebhook()));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.processed).toBe(false);
    expect(onIdenfyComplete).not.toHaveBeenCalled();
  });

  it("returns 200 processed=false for stale session webhook (scanRef mismatch)", async () => {
    const { verifyIdenfySignature, mapIdenfyStatus } =
      await import("@/lib/background-checks/idenfy");
    const { db } = await import("@/lib/db");
    const { onIdenfyComplete } =
      await import("@/lib/background-checks/orchestrator");
    vi.mocked(verifyIdenfySignature).mockReturnValue(true);
    vi.mocked(mapIdenfyStatus).mockReturnValue("FAILED");
    // Applicant is found via clientId fallback but has a different active scanRef
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant({ idenfyVerificationId: "new-scan-ref" }) as never,
    );
    vi.mocked(db.screeningAuditLog.create).mockResolvedValue({} as never);
    // idenfyVerificationId guard rejects the stale scanRef → count=0
    vi.mocked(db.applicant.updateMany).mockResolvedValue({ count: 0 });

    const res = await POST(makeRequest(makeFinalWebhook()));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.processed).toBe(false);
    expect(onIdenfyComplete).not.toHaveBeenCalled();
  });

  // ── Soft-deleted applicant ──────────────────────────────────────────────────

  it("logs audit but skips orchestration for soft-deleted applicant", async () => {
    const { verifyIdenfySignature, mapIdenfyStatus } =
      await import("@/lib/background-checks/idenfy");
    const { db } = await import("@/lib/db");
    const { onIdenfyComplete } =
      await import("@/lib/background-checks/orchestrator");
    vi.mocked(verifyIdenfySignature).mockReturnValue(true);
    vi.mocked(mapIdenfyStatus).mockReturnValue("PASSED");
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant({ deletedAt: new Date() }) as never,
    );
    vi.mocked(db.screeningAuditLog.create).mockResolvedValue({} as never);

    const res = await POST(makeRequest(makeFinalWebhook()));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.processed).toBe(false);
    // Audit log must still be written for compliance
    expect(db.screeningAuditLog.create).toHaveBeenCalled();
    // Orchestration and status update must be skipped
    expect(db.applicant.updateMany).not.toHaveBeenCalled();
    expect(onIdenfyComplete).not.toHaveBeenCalled();
  });

  // ── Orchestrator failure ────────────────────────────────────────────────────

  it("returns 500 when orchestrator throws", async () => {
    const { verifyIdenfySignature, mapIdenfyStatus } =
      await import("@/lib/background-checks/idenfy");
    const { db } = await import("@/lib/db");
    const { onIdenfyComplete } =
      await import("@/lib/background-checks/orchestrator");
    vi.mocked(verifyIdenfySignature).mockReturnValue(true);
    vi.mocked(mapIdenfyStatus).mockReturnValue("PASSED");
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant() as never,
    );
    vi.mocked(db.screeningAuditLog.create).mockResolvedValue({} as never);
    vi.mocked(db.applicant.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(onIdenfyComplete).mockRejectedValue(
      new Error("orchestrator error"),
    );

    const res = await POST(makeRequest(makeFinalWebhook()));
    expect(res.status).toBe(500);
  });
});
