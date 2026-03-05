import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    applicant: { groupBy: vi.fn() },
    match: { groupBy: vi.fn() },
    event: { findMany: vi.fn() },
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(type: string): Request {
  return new Request(
    `http://localhost/api/admin/stats/location-breakdown?type=${type}`,
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/admin/stats/location-breakdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    vi.mocked(getAuthUser).mockResolvedValue(null);

    const res = await GET(makeRequest("applications"));
    expect(res.status).toBe(401);
  });

  it("returns 403 when not admin", async () => {
    const { getAuthUser, requireAdmin } = await import("@/lib/auth");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "u1",
      email: "user@example.com",
    } as never);
    vi.mocked(requireAdmin).mockImplementation(() => {
      throw new Error("Not admin");
    });

    const res = await GET(makeRequest("applications"));
    expect(res.status).toBe(403);
  });

  it("returns location breakdown for applications type", async () => {
    const { getAuthUser, requireAdmin } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");

    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "u1",
      email: "admin@example.com",
    } as never);
    vi.mocked(requireAdmin).mockReturnValue(undefined);
    vi.mocked(db.applicant.groupBy).mockResolvedValue([
      { location: "Phoenix, AZ", _count: 10 },
      { location: "Scottsdale, AZ", _count: 5 },
    ] as never);

    const res = await GET(makeRequest("applications"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.breakdown).toHaveLength(2);
    // Should be sorted by count descending
    expect(json.breakdown[0].location).toBe("Phoenix, AZ");
    expect(json.breakdown[0].count).toBe(10);
  });

  it("returns location breakdown for users type", async () => {
    const { getAuthUser, requireAdmin } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");

    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "u1",
      email: "admin@example.com",
    } as never);
    vi.mocked(requireAdmin).mockReturnValue(undefined);
    vi.mocked(db.applicant.groupBy).mockResolvedValue([
      { location: "Tucson, AZ", _count: 3 },
    ] as never);

    const res = await GET(makeRequest("users"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.breakdown[0].location).toBe("Tucson, AZ");
    expect(json.breakdown[0].count).toBe(3);
  });

  it("returns location breakdown for waitlist type", async () => {
    const { getAuthUser, requireAdmin } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");

    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "u1",
      email: "admin@example.com",
    } as never);
    vi.mocked(requireAdmin).mockReturnValue(undefined);
    vi.mocked(db.applicant.groupBy).mockResolvedValue([
      { location: "Phoenix, AZ", _count: 7 },
      { location: "Mesa, AZ", _count: 2 },
    ] as never);

    const res = await GET(makeRequest("waitlist"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.breakdown).toHaveLength(2);
  });

  it("returns location breakdown for matches type by joining event locations", async () => {
    const { getAuthUser, requireAdmin } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");

    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "u1",
      email: "admin@example.com",
    } as never);
    vi.mocked(requireAdmin).mockReturnValue(undefined);
    vi.mocked(db.match.groupBy).mockResolvedValue([
      { eventId: "ev1", _count: 15 },
      { eventId: "ev2", _count: 8 },
    ] as never);
    vi.mocked(db.event.findMany).mockResolvedValue([
      { id: "ev1", location: "Phoenix, AZ" },
      { id: "ev2", location: "Phoenix, AZ" }, // same city → should sum
    ] as never);

    const res = await GET(makeRequest("matches"));
    expect(res.status).toBe(200);
    const json = await res.json();
    // Both events are in Phoenix → combined count = 23
    const phoenixEntry = json.breakdown.find(
      (b: { location: string }) => b.location === "Phoenix, AZ",
    );
    expect(phoenixEntry).toBeDefined();
    expect(phoenixEntry.count).toBe(23);
  });

  it("groups matches with null event location under 'Unknown'", async () => {
    const { getAuthUser, requireAdmin } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");

    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "u1",
      email: "admin@example.com",
    } as never);
    vi.mocked(requireAdmin).mockReturnValue(undefined);
    vi.mocked(db.match.groupBy).mockResolvedValue([
      { eventId: "ev-null", _count: 4 },
    ] as never);
    vi.mocked(db.event.findMany).mockResolvedValue([
      { id: "ev-null", location: null },
    ] as never);

    const res = await GET(makeRequest("matches"));
    const json = await res.json();
    const unknownEntry = json.breakdown.find(
      (b: { location: string }) => b.location === "Unknown",
    );
    expect(unknownEntry?.count).toBe(4);
  });

  it("defaults to applications type when no type param is provided", async () => {
    const { getAuthUser, requireAdmin } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");

    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "u1",
      email: "admin@example.com",
    } as never);
    vi.mocked(requireAdmin).mockReturnValue(undefined);
    vi.mocked(db.applicant.groupBy).mockResolvedValue([]);

    const res = await GET(
      new Request("http://localhost/api/admin/stats/location-breakdown"),
    );
    expect(res.status).toBe(200);
    expect(db.applicant.groupBy).toHaveBeenCalledOnce();
  });

  it("returns empty breakdown when no data exists", async () => {
    const { getAuthUser, requireAdmin } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");

    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "u1",
      email: "admin@example.com",
    } as never);
    vi.mocked(requireAdmin).mockReturnValue(undefined);
    vi.mocked(db.applicant.groupBy).mockResolvedValue([]);

    const res = await GET(makeRequest("applications"));
    const json = await res.json();
    expect(json.breakdown).toHaveLength(0);
  });
});
