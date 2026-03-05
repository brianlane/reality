import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    event: { findUnique: vi.fn() },
    applicant: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/matching/weighted-compatibility", () => ({
  preloadAnswerCache: vi.fn(),
  scoreAllPairs: vi.fn(),
  selectCohortFromScores: vi.fn(),
  computeDistinctMatches: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown> = {}): Request {
  return new Request(
    "http://localhost/api/admin/events/ev1/generate-matches-stream",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

async function collectSSE(
  response: Response,
): Promise<Array<{ event: string; data: unknown }>> {
  const text = await response.text();
  const events: Array<{ event: string; data: unknown }> = [];
  let currentEvent = "";
  for (const line of text.split("\n")) {
    if (line.startsWith("event: ")) {
      currentEvent = line.slice(7);
    } else if (line.startsWith("data: ")) {
      events.push({ event: currentEvent, data: JSON.parse(line.slice(6)) });
      currentEvent = "";
    }
  }
  return events;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/admin/events/[id]/generate-matches-stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    const { getAuthUser } = await import("@/lib/auth");
    vi.mocked(getAuthUser).mockResolvedValue(null);

    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: "ev1" }),
    });
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

    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: "ev1" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 when event not found", async () => {
    const { getAuthUser, requireAdmin } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "u1",
      email: "admin@example.com",
    } as never);
    vi.mocked(requireAdmin).mockReturnValue(undefined);
    vi.mocked(db.event.findUnique).mockResolvedValue(null);

    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: "ev1" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 when event has no location", async () => {
    const { getAuthUser, requireAdmin } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "u1",
      email: "admin@example.com",
    } as never);
    vi.mocked(requireAdmin).mockReturnValue(undefined);
    vi.mocked(db.event.findUnique).mockResolvedValue({
      id: "ev1",
      location: null,
    } as never);

    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: "ev1" }),
    });
    expect(res.status).toBe(400);
  });

  it("streams SSE with init, progress, and complete events", async () => {
    const { getAuthUser, requireAdmin } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    const {
      preloadAnswerCache,
      scoreAllPairs,
      selectCohortFromScores,
      computeDistinctMatches,
    } = await import("@/lib/matching/weighted-compatibility");

    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "u1",
      email: "admin@example.com",
    } as never);
    vi.mocked(requireAdmin).mockReturnValue(undefined);
    vi.mocked(db.event.findUnique).mockResolvedValue({
      id: "ev1",
      location: "Phoenix, AZ",
    } as never);
    vi.mocked(db.applicant.findMany).mockResolvedValue([
      {
        id: "m1",
        gender: "MAN",
        _count: { eventInvitations: 0 },
        user: { firstName: "A", lastName: "B" },
        createdAt: new Date(),
      },
      {
        id: "w1",
        gender: "WOMAN",
        _count: { eventInvitations: 0 },
        user: { firstName: "C", lastName: "D" },
        createdAt: new Date(),
      },
    ] as never);
    vi.mocked(preloadAnswerCache).mockResolvedValue({
      questions: [],
      answersByApplicant: new Map(),
      crossPairIndex: { resolved: [], coveredIds: new Set() },
    });
    vi.mocked(scoreAllPairs).mockResolvedValue({
      allScores: [
        { manId: "m1", womanId: "w1", score: 80, dealbreakersViolated: [] },
      ],
      recommendations: [
        { applicantId: "m1", partnerId: "w1", score: 80, dealbreakers: [] },
      ],
    });
    vi.mocked(selectCohortFromScores).mockReturnValue({
      finalMenIds: ["m1"],
      finalWomenIds: ["w1"],
      finalMenSet: new Set(["m1"]),
      finalWomenSet: new Set(["w1"]),
      recommendations: [
        { applicantId: "m1", partnerId: "w1", score: 80, dealbreakers: [] },
      ],
    });
    vi.mocked(computeDistinctMatches).mockReturnValue([
      { applicantId: "m1", partnerId: "w1", score: 80 },
    ] as never);

    const res = await POST(makeRequest({ minScore: 60 }), {
      params: Promise.resolve({ id: "ev1" }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const events = await collectSSE(res);
    const eventNames = events.map((e) => e.event);
    expect(eventNames).toContain("init");
    expect(eventNames).toContain("complete");

    const completeEvent = events.find((e) => e.event === "complete");
    expect(completeEvent?.data).toMatchObject({
      cohortMenCount: 1,
      cohortWomenCount: 1,
      distinctCount: 1,
    });
  });

  it("includes flagged exclusions in init event", async () => {
    const { getAuthUser, requireAdmin } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    const {
      preloadAnswerCache,
      scoreAllPairs,
      selectCohortFromScores,
      computeDistinctMatches,
    } = await import("@/lib/matching/weighted-compatibility");

    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "u1",
      email: "admin@example.com",
    } as never);
    vi.mocked(requireAdmin).mockReturnValue(undefined);
    vi.mocked(db.event.findUnique).mockResolvedValue({
      id: "ev1",
      location: "Phoenix, AZ",
    } as never);
    vi.mocked(db.applicant.findMany).mockResolvedValue([
      {
        id: "m-red",
        gender: "MAN",
        relationshipReadinessFlag: "RED",
        saScreeningFlag: null,
        screeningFlagOverride: false,
        _count: { eventInvitations: 0 },
        user: { firstName: "R", lastName: "M" },
        createdAt: new Date(),
      },
      {
        id: "m-ok",
        gender: "MAN",
        relationshipReadinessFlag: null,
        saScreeningFlag: null,
        screeningFlagOverride: false,
        _count: { eventInvitations: 0 },
        user: { firstName: "A", lastName: "B" },
        createdAt: new Date(),
      },
      {
        id: "w1",
        gender: "WOMAN",
        relationshipReadinessFlag: null,
        saScreeningFlag: null,
        screeningFlagOverride: false,
        _count: { eventInvitations: 0 },
        user: { firstName: "C", lastName: "D" },
        createdAt: new Date(),
      },
    ] as never);
    vi.mocked(preloadAnswerCache).mockResolvedValue({
      questions: [],
      answersByApplicant: new Map(),
      crossPairIndex: { resolved: [], coveredIds: new Set() },
    });
    vi.mocked(scoreAllPairs).mockResolvedValue({
      allScores: [
        { manId: "m-ok", womanId: "w1", score: 80, dealbreakersViolated: [] },
      ],
      recommendations: [
        { applicantId: "m-ok", partnerId: "w1", score: 80, dealbreakers: [] },
      ],
    });
    vi.mocked(selectCohortFromScores).mockReturnValue({
      finalMenIds: ["m-ok"],
      finalWomenIds: ["w1"],
      finalMenSet: new Set(["m-ok"]),
      finalWomenSet: new Set(["w1"]),
      recommendations: [
        { applicantId: "m-ok", partnerId: "w1", score: 80, dealbreakers: [] },
      ],
    });
    vi.mocked(computeDistinctMatches).mockReturnValue([
      { applicantId: "m-ok", partnerId: "w1", score: 80 },
    ] as never);

    const res = await POST(makeRequest({ minScore: 60 }), {
      params: Promise.resolve({ id: "ev1" }),
    });

    const events = await collectSSE(res);
    const initEvent = events.find((e) => e.event === "init");
    expect(initEvent).toBeDefined();
    expect(initEvent?.data).toMatchObject({
      applicantsExcludedByFlags: 1,
    });
    const initData = initEvent?.data as {
      flaggedExclusions?: Array<{ applicantId: string }>;
    };
    expect(initData.flaggedExclusions?.[0]?.applicantId).toBe("m-red");
  });

  it("sends error event when scoring throws", async () => {
    const { getAuthUser, requireAdmin } = await import("@/lib/auth");
    const { db } = await import("@/lib/db");
    const { preloadAnswerCache, scoreAllPairs } =
      await import("@/lib/matching/weighted-compatibility");

    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "u1",
      email: "admin@example.com",
    } as never);
    vi.mocked(requireAdmin).mockReturnValue(undefined);
    vi.mocked(db.event.findUnique).mockResolvedValue({
      id: "ev1",
      location: "Phoenix, AZ",
    } as never);
    vi.mocked(db.applicant.findMany).mockResolvedValue([
      {
        id: "m1",
        gender: "MAN",
        _count: { eventInvitations: 0 },
        user: { firstName: "A", lastName: "B" },
        createdAt: new Date(),
      },
      {
        id: "w1",
        gender: "WOMAN",
        _count: { eventInvitations: 0 },
        user: { firstName: "C", lastName: "D" },
        createdAt: new Date(),
      },
    ] as never);
    vi.mocked(preloadAnswerCache).mockResolvedValue({
      questions: [],
      answersByApplicant: new Map(),
      crossPairIndex: { resolved: [], coveredIds: new Set() },
    });
    vi.mocked(scoreAllPairs).mockRejectedValue(new Error("DB connection lost"));

    const res = await POST(makeRequest(), {
      params: Promise.resolve({ id: "ev1" }),
    });
    const events = await collectSSE(res);
    const errorEvent = events.find((e) => e.event === "error");
    expect(errorEvent).toBeDefined();
    expect((errorEvent!.data as { message: string }).message).toBe(
      "DB connection lost",
    );
  });

  it("returns 400 for invalid request body", async () => {
    const { getAuthUser, requireAdmin } = await import("@/lib/auth");
    vi.mocked(getAuthUser).mockResolvedValue({
      userId: "u1",
      email: "admin@example.com",
    } as never);
    vi.mocked(requireAdmin).mockReturnValue(undefined);

    const req = new Request(
      "http://localhost/api/admin/events/ev1/generate-matches-stream",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minScore: "not-a-number" }),
      },
    );

    const { db } = await import("@/lib/db");
    vi.mocked(db.event.findUnique).mockResolvedValue({
      id: "ev1",
      location: "Phoenix, AZ",
    } as never);

    const res = await POST(req, { params: Promise.resolve({ id: "ev1" }) });
    expect(res.status).toBe(400);
  });
});
