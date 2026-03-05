import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "./route";

vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    applicant: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/admin-helpers", () => ({
  getOrCreateAdminUser: vi.fn(),
}));

function makeRequest(body: unknown): Request {
  return new Request(
    "http://localhost/api/admin/applications/app1/flag-override",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

const routeCtx = { params: Promise.resolve({ id: "app1" }) };

describe("PATCH /api/admin/applications/[id]/flag-override", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    vi.mocked(getAuthUser).mockResolvedValue(null);

    const res = await PATCH(makeRequest({ override: true }), routeCtx);
    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    const { getAuthUser, requireAdmin } = await import("@/lib/auth");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "u1",
      email: "user@example.com",
    } as never);
    vi.mocked(requireAdmin).mockImplementation(() => {
      throw new Error("Not an admin");
    });

    const res = await PATCH(makeRequest({ override: true }), routeCtx);
    expect(res.status).toBe(403);
  });

  it("returns 400 when override field is missing or not boolean", async () => {
    const { getAuthUser, requireAdmin } = await import("@/lib/auth");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "u1",
      email: "admin@example.com",
    } as never);
    vi.mocked(requireAdmin).mockReturnValue(undefined);

    const res = await PATCH(makeRequest({ override: "yes" }), routeCtx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when applicant not found", async () => {
    const { getAuthUser, requireAdmin } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    const { getOrCreateAdminUser } = await import("@/lib/admin-helpers");

    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "u1",
      email: "admin@example.com",
    } as never);
    vi.mocked(requireAdmin).mockReturnValue(undefined);
    vi.mocked(getOrCreateAdminUser).mockResolvedValue({
      id: "admin1",
    } as never);
    vi.mocked(db.applicant.findFirst).mockResolvedValue(null);

    const res = await PATCH(makeRequest({ override: true }), routeCtx);
    expect(res.status).toBe(404);
  });

  it("sets override to true and records reviewer", async () => {
    const { getAuthUser, requireAdmin } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    const { getOrCreateAdminUser } = await import("@/lib/admin-helpers");

    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "u1",
      email: "admin@example.com",
    } as never);
    vi.mocked(requireAdmin).mockReturnValue(undefined);
    vi.mocked(getOrCreateAdminUser).mockResolvedValue({
      id: "admin1",
    } as never);
    vi.mocked(db.applicant.findFirst).mockResolvedValue({
      id: "app1",
    } as never);
    vi.mocked(db.applicant.update).mockResolvedValue({
      id: "app1",
      screeningFlagOverride: true,
      relationshipReadinessFlag: "RED",
      saScreeningFlag: null,
      screeningFlagReviewedAt: new Date("2026-01-01"),
    } as never);

    const res = await PATCH(makeRequest({ override: true }), routeCtx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.applicant.screeningFlagOverride).toBe(true);
    expect(db.applicant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          screeningFlagOverride: true,
          screeningFlagReviewedBy: "admin1",
        }),
      }),
    );
  });

  it("sets override to false when removing override", async () => {
    const { getAuthUser, requireAdmin } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    const { getOrCreateAdminUser } = await import("@/lib/admin-helpers");

    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "u1",
      email: "admin@example.com",
    } as never);
    vi.mocked(requireAdmin).mockReturnValue(undefined);
    vi.mocked(getOrCreateAdminUser).mockResolvedValue({
      id: "admin1",
    } as never);
    vi.mocked(db.applicant.findFirst).mockResolvedValue({
      id: "app1",
    } as never);
    vi.mocked(db.applicant.update).mockResolvedValue({
      id: "app1",
      screeningFlagOverride: false,
      relationshipReadinessFlag: "RED",
      saScreeningFlag: null,
      screeningFlagReviewedAt: new Date("2026-01-01"),
    } as never);

    const res = await PATCH(makeRequest({ override: false }), routeCtx);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.applicant.screeningFlagOverride).toBe(false);
  });
});
