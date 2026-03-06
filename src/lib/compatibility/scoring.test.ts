import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  parseDraftQuestionMetadata,
  verifyQuestionConfigAgainstDraft,
  computeAndStoreApplicantCompatibility,
} from "./scoring";
import type { Applicant } from "@prisma/client";
import { db } from "@/lib/db";
import { applyFilters, checkScreeningFlags } from "@/lib/matching/filters";
import {
  preloadAnswerCache,
  scorePairFromCache,
} from "@/lib/matching/weighted-compatibility";

vi.mock("@/lib/db", () => ({
  db: {
    applicant: {
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/matching/filters", () => ({
  applyFilters: vi.fn(),
  checkScreeningFlags: vi.fn(),
}));

vi.mock("@/lib/matching/weighted-compatibility", () => ({
  preloadAnswerCache: vi.fn(),
  scorePairFromCache: vi.fn(),
}));

describe("parseDraftQuestionMetadata", () => {
  it("extracts weight and dealbreaker metadata from annotated lines", () => {
    const markdown = `
1. Do you have children? \`[DROPDOWN: Yes, No | w=0.7]\`
2. Would you like to have children? \`[DROPDOWN: Yes, No | w=1.0 | dealbreaker=true]\`
3. What is your occupation? \`[TEXT]\`
`;
    const parsed = parseDraftQuestionMetadata(markdown);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toMatchObject({
      prompt: "Do you have children?",
      weight: 0.7,
      dealbreaker: false,
    });
    expect(parsed[1]).toMatchObject({
      prompt: "Would you like to have children?",
      weight: 1,
      dealbreaker: true,
    });
  });
});

describe("verifyQuestionConfigAgainstDraft", () => {
  it("reports mismatches and missing prompts", () => {
    const draft = [
      { prompt: "Q1", weight: 0.6, dealbreaker: false },
      { prompt: "Q2", weight: 1.0, dealbreaker: true },
      { prompt: "Q3", weight: 0.4, dealbreaker: false },
    ];
    const actual = [
      { prompt: "Q1", mlWeight: 0.6, isDealbreaker: false },
      { prompt: "Q2", mlWeight: 0.8, isDealbreaker: false },
    ];

    const summary = verifyQuestionConfigAgainstDraft(draft, actual as never);
    expect(summary.draftWeightedQuestions).toBe(3);
    expect(summary.matchedQuestions).toBe(2);
    expect(summary.weightMismatchCount).toBe(1);
    expect(summary.dealbreakerMismatchCount).toBe(1);
    expect(summary.missingInDatabaseCount).toBe(1);
    expect(summary.missingInDatabase).toContain("Q3");
  });
});

describe("computeAndStoreApplicantCompatibility", () => {
  const mockApplicant = {
    id: "app-1",
    location: "NYC",
    relationshipReadinessFlag: null,
    saScreeningFlag: null,
  } as Applicant;

  const emptyCache = {
    answersByApplicant: new Map<string, Map<string, unknown>>(),
    questions: [],
    crossPairIndex: new Map(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.applicant.update).mockResolvedValue(mockApplicant as never);
  });

  it("stores null and returns candidateCount 0 when no eligible candidates exist", async () => {
    vi.mocked(db.applicant.findUniqueOrThrow).mockResolvedValue(mockApplicant);
    vi.mocked(db.applicant.findMany).mockResolvedValue([]);
    vi.mocked(applyFilters).mockReturnValue([]);
    vi.mocked(preloadAnswerCache).mockResolvedValue(emptyCache as never);

    const result = await computeAndStoreApplicantCompatibility("app-1");

    expect(result.finalScore).toBeNull();
    expect(result.candidateCount).toBe(0);
    expect(vi.mocked(db.applicant.update)).toHaveBeenCalledWith({
      where: { id: "app-1" },
      data: { compatibilityScore: null },
    });
  });

  it("computes average pairwise score with flag multipliers and stores result", async () => {
    const candidate1 = { ...mockApplicant, id: "cand-1" } as Applicant;
    const candidate2 = { ...mockApplicant, id: "cand-2" } as Applicant;

    vi.mocked(db.applicant.findUniqueOrThrow).mockResolvedValue({
      ...mockApplicant,
      // YELLOW readiness → 0.9 multiplier; no SA flag → 1.0; combined = 0.9
      relationshipReadinessFlag: "YELLOW" as never,
    });
    vi.mocked(db.applicant.findMany).mockResolvedValue([
      candidate1,
      candidate2,
    ] as never);
    vi.mocked(applyFilters).mockReturnValue([candidate1, candidate2]);
    vi.mocked(checkScreeningFlags).mockReturnValue(null);

    const cache = {
      answersByApplicant: new Map([
        ["app-1", new Map()],
        ["cand-1", new Map()],
        ["cand-2", new Map()],
      ]),
      questions: [],
      crossPairIndex: new Map(),
    };
    vi.mocked(preloadAnswerCache).mockResolvedValue(cache as never);
    // Both pairs score 80 → average = 80 → 80 * 0.9 = 72
    vi.mocked(scorePairFromCache).mockReturnValue({ score: 80 } as never);

    const result = await computeAndStoreApplicantCompatibility("app-1");

    expect(result.candidateCount).toBe(2);
    expect(result.averagePairwiseScore).toBe(80);
    expect(result.multiplier).toBe(0.9);
    expect(result.finalScore).toBe(72);
    expect(vi.mocked(db.applicant.update)).toHaveBeenCalledWith({
      where: { id: "app-1" },
      data: { compatibilityScore: 72 },
    });
  });

  it("excludes candidates blocked by RED screening flags", async () => {
    const candidate1 = { ...mockApplicant, id: "cand-1" } as Applicant;
    const candidate2 = { ...mockApplicant, id: "cand-2" } as Applicant;

    vi.mocked(db.applicant.findUniqueOrThrow).mockResolvedValue(mockApplicant);
    vi.mocked(db.applicant.findMany).mockResolvedValue([
      candidate1,
      candidate2,
    ] as never);
    vi.mocked(applyFilters).mockReturnValue([candidate1, candidate2]);
    vi.mocked(checkScreeningFlags).mockImplementation((c) =>
      c.id === "cand-1"
        ? {
            applicantId: "cand-1",
            reason: "RED SA flag",
            flag: "saRisk" as const,
            severity: "RED" as never,
          }
        : null,
    );

    const cache = {
      answersByApplicant: new Map([
        ["app-1", new Map()],
        ["cand-2", new Map()],
      ]),
      questions: [],
      crossPairIndex: new Map(),
    };
    vi.mocked(preloadAnswerCache).mockResolvedValue(cache as never);
    vi.mocked(scorePairFromCache).mockReturnValue({ score: 60 } as never);

    const result = await computeAndStoreApplicantCompatibility("app-1");

    expect(result.candidateCount).toBe(1);
    expect(result.finalScore).toBe(60);
    // cand-1 should NOT appear in the ids passed to preloadAnswerCache
    expect(vi.mocked(preloadAnswerCache)).toHaveBeenCalledWith(
      expect.not.arrayContaining(["cand-1"]),
    );
  });

  it("clamps final score to [0, 100]", async () => {
    const candidate = { ...mockApplicant, id: "cand-1" } as Applicant;

    vi.mocked(db.applicant.findUniqueOrThrow).mockResolvedValue(mockApplicant);
    vi.mocked(db.applicant.findMany).mockResolvedValue([candidate] as never);
    vi.mocked(applyFilters).mockReturnValue([candidate]);
    vi.mocked(checkScreeningFlags).mockReturnValue(null);

    const cache = {
      answersByApplicant: new Map([
        ["app-1", new Map()],
        ["cand-1", new Map()],
      ]),
      questions: [],
      crossPairIndex: new Map(),
    };
    vi.mocked(preloadAnswerCache).mockResolvedValue(cache as never);
    // Artificially large raw score to verify clamping
    vi.mocked(scorePairFromCache).mockReturnValue({ score: 200 } as never);

    const result = await computeAndStoreApplicantCompatibility("app-1");

    expect(result.finalScore).toBe(100);
  });
});
