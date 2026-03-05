import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    event: { findFirst: vi.fn(), update: vi.fn() },
    match: { findMany: vi.fn() },
    eventInvitation: { upsert: vi.fn() },
    adminAction: { create: vi.fn() },
    applicant: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/admin-helpers", () => ({
  getOrCreateAdminUser: vi.fn(),
}));

vi.mock("@/lib/email/events", () => ({
  sendEventInvitationEmail: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/admin/events/ev1/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const PARAMS = { params: Promise.resolve({ id: "ev1" }) };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/admin/events/[id]/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    vi.mocked(getAuthUser).mockResolvedValue(null);

    const res = await POST(makeRequest({ applicantIds: ["a1"] }), PARAMS);
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

    const res = await POST(makeRequest({ applicantIds: ["a1"] }), PARAMS);
    expect(res.status).toBe(403);
  });

  it("returns 404 when event not found", async () => {
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
    vi.mocked(db.event.findFirst).mockResolvedValue(null);

    const res = await POST(makeRequest({ applicantIds: ["a1"] }), PARAMS);
    expect(res.status).toBe(404);
  });

  it("returns 400 when no matches have been generated", async () => {
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
    vi.mocked(db.event.findFirst).mockResolvedValue({
      id: "ev1",
      name: "Test Event",
    } as never);
    vi.mocked(db.match.findMany).mockResolvedValue([]); // no CURATED matches

    const res = await POST(makeRequest({ applicantIds: ["a1"] }), PARAMS);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.message).toMatch(/generate matches first/i);
  });

  it("returns 400 when applicant is outside the match cohort", async () => {
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
    vi.mocked(db.event.findFirst).mockResolvedValue({
      id: "ev1",
      name: "Test Event",
    } as never);
    // Cohort only contains m1 and w1
    vi.mocked(db.match.findMany).mockResolvedValue([
      { applicantId: "m1", partnerId: "w1" },
    ] as never);

    // Trying to invite "outsider" who is not in the cohort
    const res = await POST(makeRequest({ applicantIds: ["outsider"] }), PARAMS);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.message).toMatch(/not in the match cohort/i);
  });

  it("creates invitations for all cohort members and returns success", async () => {
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
    vi.mocked(db.event.findFirst).mockResolvedValue({
      id: "ev1",
      name: "Test Event",
      date: new Date(),
      venue: "Venue",
      venueAddress: "123 St",
      startTime: new Date(),
      endTime: new Date(),
    } as never);
    vi.mocked(db.match.findMany).mockResolvedValue([
      { applicantId: "m1", partnerId: "w1" },
    ] as never);
    vi.mocked(db.eventInvitation.upsert).mockResolvedValue({
      id: "inv1",
      applicantId: "m1",
      eventId: "ev1",
      status: "PENDING",
      invitedAt: new Date(),
    } as never);
    vi.mocked(db.event.update).mockResolvedValue({} as never);
    vi.mocked(db.adminAction.create).mockResolvedValue({} as never);
    vi.mocked(db.applicant.findMany).mockResolvedValue([
      {
        id: "m1",
        user: { email: "m1@example.com", firstName: "Mike" },
      },
    ] as never);

    const res = await POST(makeRequest({ applicantIds: ["m1"] }), PARAMS);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.stats.sent).toBe(1);
  });

  it("returns 400 for invalid request body", async () => {
    const { getAuthUser, requireAdmin } = await import("@/lib/auth");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "u1",
      email: "admin@example.com",
    } as never);
    vi.mocked(requireAdmin).mockReturnValue(undefined);

    const res = await POST(makeRequest({ applicantIds: [] }), PARAMS); // empty array fails min(1)
    expect(res.status).toBe(400);
  });
});
