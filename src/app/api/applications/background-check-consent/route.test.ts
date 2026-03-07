import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    applicant: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    screeningAuditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/background-checks/orchestrator", () => ({
  initiateScreening: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: (name: string) => {
      const map: Record<string, string> = {
        "x-forwarded-for": "1.2.3.4",
        "user-agent": "test-agent",
      };
      return map[name] ?? null;
    },
  }),
}));

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeApplicant(overrides = {}) {
  return {
    id: "app-1",
    userId: "user-1",
    backgroundCheckConsentAt: null,
    applicationStatus: "SUBMITTED",
    user: {
      email: "jane@example.com",
      firstName: "Jane",
      lastName: "Doe",
    },
    ...overrides,
  };
}

function makeRequest(body: Record<string, unknown>): Request {
  return new Request(
    "http://localhost/api/applications/background-check-consent",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

const validBody = {
  applicationId: "app-1",
  fullName: "Jane Doe",
  consentGiven: true,
  evergreenConsentGiven: true,
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/applications/background-check-consent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    vi.mocked(getAuthUser).mockResolvedValue(null);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 400 when applicationId is missing", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "user-1",
      email: "jane@example.com",
    } as never);

    const res = await POST(
      makeRequest({ ...validBody, applicationId: undefined }),
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error?.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when fullName is too short", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "user-1",
      email: "jane@example.com",
    } as never);

    const res = await POST(makeRequest({ ...validBody, fullName: "J" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error?.code).toBe("VALIDATION_ERROR");
  });

  it("returns 403 when applicant is owned by a different user", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "other-user",
      email: "other@example.com",
    } as never);
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant() as never,
    );

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);
  });

  it("returns 400 when typed name does not match legal name on file", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "user-1",
      email: "jane@example.com",
    } as never);
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant() as never,
    );

    const res = await POST(makeRequest({ ...validBody, fullName: "John Doe" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error?.code).toBe("VALIDATION_ERROR");
    expect(data.error?.message).toContain("does not match");
  });

  it("returns 400 when consentGiven is false", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "user-1",
      email: "jane@example.com",
    } as never);

    const res = await POST(makeRequest({ ...validBody, consentGiven: false }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error?.code).toBe("CONSENT_REQUIRED");
  });

  it("returns 200 and skips recording when already consented", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "user-1",
      email: "jane@example.com",
    } as never);
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant({ backgroundCheckConsentAt: new Date() }) as never,
    );

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("already_consented");
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("records consent and returns 200 on success", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "user-1",
      email: "jane@example.com",
    } as never);
    vi.mocked(db.applicant.findFirst).mockResolvedValue(
      makeApplicant() as never,
    );
    vi.mocked(db.$transaction).mockResolvedValue([
      {},
      {},
      { applicationStatus: "SUBMITTED" },
    ] as never);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("consent_recorded");
    expect(db.$transaction).toHaveBeenCalled();
  });
});
