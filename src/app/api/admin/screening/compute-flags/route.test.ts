import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    applicant: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/screening", () => ({
  computeAndStoreScreeningFlags: vi.fn(),
}));

describe("POST /api/admin/screening/compute-flags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    vi.mocked(getAuthUser).mockResolvedValue(null);

    const res = await POST();
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

    const res = await POST();
    expect(res.status).toBe(403);
  });

  it("processes all applicants and returns counts", async () => {
    const { getAuthUser, requireAdmin } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    const { computeAndStoreScreeningFlags } = await import("@/lib/screening");

    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "u1",
      email: "admin@example.com",
    } as never);
    vi.mocked(requireAdmin).mockReturnValue(undefined);
    vi.mocked(db.applicant.findMany).mockResolvedValue([
      { id: "a1" },
      { id: "a2" },
      { id: "a3" },
    ] as never);
    vi.mocked(computeAndStoreScreeningFlags).mockResolvedValue({
      relationshipReadiness: { flag: "GREEN", signals: [] },
      saRisk: { flag: "GREEN", signals: [] },
    } as never);

    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.processed).toBe(3);
    expect(json.errors).toBe(0);
    expect(json.results).toHaveLength(3);
    expect(computeAndStoreScreeningFlags).toHaveBeenCalledTimes(3);
  });

  it("tracks errors per applicant without short-circuiting", async () => {
    const { getAuthUser, requireAdmin } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    const { computeAndStoreScreeningFlags } = await import("@/lib/screening");

    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "u1",
      email: "admin@example.com",
    } as never);
    vi.mocked(requireAdmin).mockReturnValue(undefined);
    vi.mocked(db.applicant.findMany).mockResolvedValue([
      { id: "a1" },
      { id: "a2" },
    ] as never);
    vi.mocked(computeAndStoreScreeningFlags)
      .mockResolvedValueOnce({
        relationshipReadiness: { flag: "GREEN", signals: [] },
        saRisk: { flag: "GREEN", signals: [] },
      } as never)
      .mockRejectedValueOnce(new Error("DB error"));

    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.processed).toBe(1);
    expect(json.errors).toBe(1);
    expect(json.errorDetails).toHaveLength(1);
    expect(json.errorDetails[0].applicantId).toBe("a2");
  });

  it("returns empty results when no applicants have answers", async () => {
    const { getAuthUser, requireAdmin } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");

    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "u1",
      email: "admin@example.com",
    } as never);
    vi.mocked(requireAdmin).mockReturnValue(undefined);
    vi.mocked(db.applicant.findMany).mockResolvedValue([] as never);

    const res = await POST();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.processed).toBe(0);
    expect(json.errors).toBe(0);
  });
});
