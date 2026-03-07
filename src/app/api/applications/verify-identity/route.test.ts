import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    applicant: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/background-checks/idenfy", () => ({
  createVerificationSession: vi.fn(),
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
    backgroundCheckConsentAt: new Date(),
    idenfyStatus: "PENDING",
    idenfyVerificationId: null,
    user: { email: "jane@example.com", firstName: "Jane", lastName: "Doe" },
    ...overrides,
  };
}

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/applications/verify-identity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeSession() {
  return {
    scanRef: "scan-ref-1",
    authToken: "auth-token-1",
    url: "https://ivs.idenfy.com/session/abc",
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/applications/verify-identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Auth and input validation ───────────────────────────────────────────────

  it("returns 401 when not authenticated", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    vi.mocked(getAuthUser).mockResolvedValue(null);

    const res = await POST(makeRequest({ applicationId: "app-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when applicationId is missing", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "user-1",
      email: "jane@example.com",
    } as never);

    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error?.code).toBe("VALIDATION_ERROR");
  });

  it("returns 404 when applicant not found", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "user-1",
      email: "jane@example.com",
    } as never);
    vi.mocked(db.applicant.findFirst).mockResolvedValue(null);

    const res = await POST(makeRequest({ applicationId: "app-1" }));
    expect(res.status).toBe(404);
  });

  it("returns 403 when authenticated user does not own the application", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "other-user",
      email: "other@example.com",
    } as never);
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant() as never,
    );

    const res = await POST(makeRequest({ applicationId: "app-1" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when FCRA consent has not been given", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "user-1",
      email: "jane@example.com",
    } as never);
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant({ backgroundCheckConsentAt: null }) as never,
    );

    const res = await POST(makeRequest({ applicationId: "app-1" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error?.code).toBe("CONSENT_REQUIRED");
  });

  // ── Short-circuit paths ─────────────────────────────────────────────────────

  it("returns already_passed when identity already verified", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "user-1",
      email: "jane@example.com",
    } as never);
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant({ idenfyStatus: "PASSED" }) as never,
    );

    const res = await POST(makeRequest({ applicationId: "app-1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("already_passed");
  });

  it("returns already_in_progress when session active and forceNewSession is not set", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "user-1",
      email: "jane@example.com",
    } as never);
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant({
        idenfyStatus: "IN_PROGRESS",
        idenfyVerificationId: "existing-scan",
      }) as never,
    );

    const res = await POST(makeRequest({ applicationId: "app-1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("already_in_progress");
    expect(data.verificationId).toBe("existing-scan");
  });

  // ── Claim from PENDING ──────────────────────────────────────────────────────

  it("claims from PENDING status and creates a session", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    const { createVerificationSession } =
      await import("@/lib/background-checks/idenfy");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "user-1",
      email: "jane@example.com",
    } as never);
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant({ idenfyStatus: "PENDING" }) as never,
    );
    // Claim from FAILED = 0 rows, claim from PENDING = 1 row
    vi.mocked(db.applicant.updateMany)
      .mockResolvedValueOnce({ count: 0 }) // claimedFromFailed
      .mockResolvedValueOnce({ count: 1 }); // claimedFromPending
    vi.mocked(createVerificationSession).mockResolvedValue(
      makeSession() as never,
    );
    vi.mocked(db.applicant.update).mockResolvedValue({} as never);

    const res = await POST(makeRequest({ applicationId: "app-1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("session_created");
    expect(data.authToken).toBe("auth-token-1");
    expect(data.scanRef).toBe("scan-ref-1");
  });

  // ── Claim from FAILED ───────────────────────────────────────────────────────

  it("claims from FAILED status and creates a session", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    const { createVerificationSession } =
      await import("@/lib/background-checks/idenfy");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "user-1",
      email: "jane@example.com",
    } as never);
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant({ idenfyStatus: "FAILED" }) as never,
    );
    // Claim from FAILED = 1 row
    vi.mocked(db.applicant.updateMany).mockResolvedValueOnce({ count: 1 });
    vi.mocked(createVerificationSession).mockResolvedValue(
      makeSession() as never,
    );
    vi.mocked(db.applicant.update).mockResolvedValue({} as never);

    const res = await POST(makeRequest({ applicationId: "app-1" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("session_created");
  });

  // ── forceNewSession ─────────────────────────────────────────────────────────

  it("forceNewSession claims from IN_PROGRESS and replaces the session", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    const { createVerificationSession } =
      await import("@/lib/background-checks/idenfy");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "user-1",
      email: "jane@example.com",
    } as never);
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant({
        idenfyStatus: "IN_PROGRESS",
        idenfyVerificationId: "old-scan",
      }) as never,
    );
    vi.mocked(db.applicant.updateMany)
      .mockResolvedValueOnce({ count: 0 }) // claimedFromFailed
      .mockResolvedValueOnce({ count: 0 }) // claimedFromPending
      .mockResolvedValueOnce({ count: 1 }); // claimedFromInProgress
    vi.mocked(createVerificationSession).mockResolvedValue(
      makeSession() as never,
    );
    vi.mocked(db.applicant.update).mockResolvedValue({} as never);

    const res = await POST(
      makeRequest({ applicationId: "app-1", forceNewSession: true }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("session_created");
  });

  it("returns already_in_progress when forceNewSession claim races and loses", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "user-1",
      email: "jane@example.com",
    } as never);
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant({
        idenfyStatus: "IN_PROGRESS",
        idenfyVerificationId: "old-scan",
      }) as never,
    );
    // All three claim attempts fail — another request already claimed
    vi.mocked(db.applicant.updateMany).mockResolvedValue({ count: 0 });

    const res = await POST(
      makeRequest({ applicationId: "app-1", forceNewSession: true }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("already_in_progress");
  });

  // ── Session creation failure + rollback ─────────────────────────────────────

  it("rolls back idenfyStatus when session creation fails (claim from PENDING)", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    const { createVerificationSession } =
      await import("@/lib/background-checks/idenfy");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "user-1",
      email: "jane@example.com",
    } as never);
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant({ idenfyStatus: "PENDING" }) as never,
    );
    vi.mocked(db.applicant.updateMany)
      .mockResolvedValueOnce({ count: 0 }) // claimedFromFailed
      .mockResolvedValueOnce({ count: 1 }) // claimedFromPending
      .mockResolvedValueOnce({ count: 1 }); // rollback
    vi.mocked(createVerificationSession).mockRejectedValue(
      new Error("iDenfy API error"),
    );

    const res = await POST(makeRequest({ applicationId: "app-1" }));
    expect(res.status).toBe(500);

    // Rollback must restore PENDING
    expect(db.applicant.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: "app-1", idenfyStatus: "IN_PROGRESS" },
        data: expect.objectContaining({ idenfyStatus: "PENDING" }),
      }),
    );
  });

  it("rolls back idenfyVerificationId to null when forceNewSession session creation fails", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    const { createVerificationSession } =
      await import("@/lib/background-checks/idenfy");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "user-1",
      email: "jane@example.com",
    } as never);
    // Applicant had no previous verification ID (null)
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant({
        idenfyStatus: "IN_PROGRESS",
        idenfyVerificationId: null,
      }) as never,
    );
    vi.mocked(db.applicant.updateMany)
      .mockResolvedValueOnce({ count: 0 }) // claimedFromFailed
      .mockResolvedValueOnce({ count: 0 }) // claimedFromPending
      .mockResolvedValueOnce({ count: 1 }) // claimedFromInProgress
      .mockResolvedValueOnce({ count: 1 }); // rollback
    vi.mocked(createVerificationSession).mockRejectedValue(
      new Error("iDenfy API error"),
    );

    const res = await POST(
      makeRequest({ applicationId: "app-1", forceNewSession: true }),
    );
    expect(res.status).toBe(500);

    // Rollback must restore the original null idenfyVerificationId
    expect(db.applicant.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          idenfyStatus: "IN_PROGRESS",
          idenfyVerificationId: null,
        }),
      }),
    );
  });
});
