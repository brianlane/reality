import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  scorePairFromCache,
  computeDistinctMatches,
  selectCohortFromScores,
  buildCompatibleCohort,
  preloadAnswerCache,
  type PairScore,
} from "./weighted-compatibility";
import { buildCrossPairIndex } from "./cross-pair-scoring";
import type { QuestionnaireQuestion } from "@prisma/client";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeQuestion(
  id: string,
  prompt: string,
  type: string,
  mlWeight: number,
  options: Record<string, unknown> | null = null,
  isDealbreaker = false,
): QuestionnaireQuestion {
  return {
    id,
    prompt,
    mlWeight,
    type: type as never,
    options,
    order: 0,
    isActive: true,
    isDealbreaker,
    deletedAt: null,
    importanceModifierForId: null,
  } as unknown as QuestionnaireQuestion;
}

function answers(pairs: [string, unknown][]): Map<string, unknown> {
  return new Map(pairs);
}

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/db", () => ({
  db: {
    questionnaireQuestion: { findMany: vi.fn() },
    questionnaireAnswer: { findMany: vi.fn() },
  },
}));

// ── scorePairFromCache ────────────────────────────────────────────────────────

describe("scorePairFromCache", () => {
  it("returns 50 when no questions are answered", () => {
    const result = scorePairFromCache([], new Map(), new Map());
    expect(result.score).toBe(50);
    expect(result.questionsScored).toBe(0);
  });

  it("returns 100 for perfect match on a RADIO_7 question", () => {
    const q = makeQuestion("q1", "Prompt", "RADIO_7", 1.0);
    const a = answers([["q1", 5]]);
    const b = answers([["q1", 5]]);
    const result = scorePairFromCache([q], a, b);
    expect(result.score).toBe(100);
  });

  it("returns 0 for complete mismatch on a RADIO_7 question", () => {
    const q = makeQuestion("q1", "Prompt", "RADIO_7", 1.0);
    const a = answers([["q1", 1]]);
    const b = answers([["q1", 7]]);
    const result = scorePairFromCache([q], a, b);
    expect(result.score).toBe(0);
  });

  it("returns 50 when one applicant has not answered", () => {
    const q = makeQuestion("q1", "Prompt", "RADIO_7", 1.0);
    const a = answers([["q1", 5]]);
    const b = new Map(); // no answer
    const result = scorePairFromCache([q], a, b);
    expect(result.score).toBe(50);
    expect(result.questionsScored).toBe(0);
  });

  it("sets score to 0 and records dealbreaker violation", () => {
    const q = makeQuestion(
      "q1",
      "Dealbreaker question",
      "RADIO_7",
      1.0,
      null,
      true,
    );
    const a = answers([["q1", 1]]);
    const b = answers([["q1", 7]]);
    const result = scorePairFromCache([q], a, b);
    expect(result.score).toBe(0);
    expect(result.dealbreakersViolated).toContain("q1");
  });

  it("scores NUMBER_SCALE questions by distance", () => {
    const q = makeQuestion("q1", "Scale question", "NUMBER_SCALE", 1.0, {
      min: 0,
      max: 10,
    });
    const a = answers([["q1", 0]]);
    const b = answers([["q1", 10]]);
    const result = scorePairFromCache([q], a, b);
    expect(result.score).toBe(0);

    const a2 = answers([["q1", 5]]);
    const b2 = answers([["q1", 5]]);
    const result2 = scorePairFromCache([q], a2, b2);
    expect(result2.score).toBe(100);
  });

  it("uses the pre-built cross-pair index when provided", () => {
    const statusQ = makeQuestion("q-pets", "Do you have pets?", "RADIO_7", 0.5);
    const prefQ = makeQuestion(
      "q-pets-pref",
      "How do you feel about a partner having pets?",
      "RADIO_7",
      0.5,
    );
    const questions = [statusQ, prefQ];
    const prebuilt = buildCrossPairIndex(questions);

    // A has pets, B is very uncomfortable — should score low
    const aAnswers = answers([
      ["q-pets", "Yes"],
      ["q-pets-pref", "Very comfortable - I love pets"],
    ]);
    const bAnswers = answers([
      ["q-pets", "No"],
      [
        "q-pets-pref",
        "Very uncomfortable - I'm allergic or cannot accommodate",
      ],
    ]);

    const withPrebuilt = scorePairFromCache(
      questions,
      aAnswers,
      bAnswers,
      prebuilt,
    );
    const withoutPrebuilt = scorePairFromCache(questions, aAnswers, bAnswers);

    // Both should produce the same score
    expect(withPrebuilt.score).toBe(withoutPrebuilt.score);
  });
});

// ── selectCohortFromScores ────────────────────────────────────────────────────

describe("selectCohortFromScores", () => {
  function makeScore(manId: string, womanId: string, score: number): PairScore {
    return { manId, womanId, score, dealbreakersViolated: [] };
  }

  it("returns empty cohort when no pairs meet minScore", () => {
    const men = [{ id: "m1" }, { id: "m2" }];
    const women = [{ id: "w1" }, { id: "w2" }];
    const allScores: PairScore[] = [
      makeScore("m1", "w1", 50),
      makeScore("m1", "w2", 40),
      makeScore("m2", "w1", 30),
      makeScore("m2", "w2", 20),
    ];
    const result = selectCohortFromScores(allScores, men, women, 60, 10);
    expect(result.finalMenIds).toHaveLength(0);
    expect(result.finalWomenIds).toHaveLength(0);
    expect(result.recommendations).toHaveLength(0);
  });

  it("builds a mutually compatible cohort", () => {
    const men = [{ id: "m1" }, { id: "m2" }];
    const women = [{ id: "w1" }, { id: "w2" }];
    // All four pairs pass — full 2×2 cohort expected
    const allScores: PairScore[] = [
      makeScore("m1", "w1", 80),
      makeScore("m1", "w2", 75),
      makeScore("m2", "w1", 70),
      makeScore("m2", "w2", 65),
    ];
    const result = selectCohortFromScores(allScores, men, women, 60, 10);
    expect(result.finalMenIds).toHaveLength(2);
    expect(result.finalWomenIds).toHaveLength(2);
    expect(result.recommendations).toHaveLength(4);
  });

  it("respects maxPerGender cap", () => {
    const men = Array.from({ length: 5 }, (_, i) => ({ id: `m${i + 1}` }));
    const women = Array.from({ length: 5 }, (_, i) => ({ id: `w${i + 1}` }));
    // All 25 pairs pass
    const allScores: PairScore[] = men.flatMap((m) =>
      women.map((w) => makeScore(m.id, w.id, 80)),
    );
    const result = selectCohortFromScores(allScores, men, women, 60, 2);
    expect(result.finalMenIds.length).toBeLessThanOrEqual(2);
    expect(result.finalWomenIds.length).toBeLessThanOrEqual(2);
  });

  it("handles unbalanced genders (more men than women)", () => {
    const men = [{ id: "m1" }, { id: "m2" }, { id: "m3" }];
    const women = [{ id: "w1" }];
    const allScores: PairScore[] = men.map((m) => makeScore(m.id, "w1", 80));
    const result = selectCohortFromScores(allScores, men, women, 60, 10);
    expect(result.finalWomenIds).toHaveLength(1);
    expect(result.finalWomenIds[0]).toBe("w1");
    expect(result.finalMenIds.length).toBeGreaterThan(0);
  });

  it("produces deterministic output when passCount ties exist", () => {
    // m1 and m2 both pass with w1 — tie in passCount; result should be stable
    const men = [{ id: "m1" }, { id: "m2" }];
    const women = [{ id: "w1" }];
    const allScores: PairScore[] = [
      makeScore("m1", "w1", 80),
      makeScore("m2", "w1", 80),
    ];
    const result1 = selectCohortFromScores(allScores, men, women, 60, 10);
    const result2 = selectCohortFromScores(allScores, men, women, 60, 10);
    expect(result1.finalMenIds).toEqual(result2.finalMenIds);
    expect(result1.finalWomenIds).toEqual(result2.finalWomenIds);
  });

  it("excludes pairs with dealbreaker violations from cohort", () => {
    const men = [{ id: "m1" }];
    const women = [{ id: "w1" }];
    const allScores: PairScore[] = [
      {
        manId: "m1",
        womanId: "w1",
        score: 90,
        dealbreakersViolated: ["q-dealbreaker"],
      },
    ];
    const result = selectCohortFromScores(allScores, men, women, 60, 10);
    expect(result.finalMenIds).toHaveLength(0);
    expect(result.finalWomenIds).toHaveLength(0);
  });
});

// ── computeDistinctMatches ────────────────────────────────────────────────────

describe("computeDistinctMatches", () => {
  it("returns empty array for empty input", () => {
    expect(computeDistinctMatches([])).toEqual([]);
  });

  it("assigns each person at most once", () => {
    const pairs = [
      { applicantId: "m1", partnerId: "w1", score: 90, dealbreakers: [] },
      { applicantId: "m1", partnerId: "w2", score: 80, dealbreakers: [] },
      { applicantId: "m2", partnerId: "w1", score: 70, dealbreakers: [] },
    ];
    const result = computeDistinctMatches(pairs);
    const usedIds = result.flatMap((p) => [p.applicantId, p.partnerId]);
    const unique = new Set(usedIds);
    expect(unique.size).toBe(usedIds.length);
  });

  it("picks highest-scoring pairs first", () => {
    const pairs = [
      { applicantId: "m1", partnerId: "w1", score: 95, dealbreakers: [] },
      { applicantId: "m1", partnerId: "w2", score: 60, dealbreakers: [] },
    ];
    const result = computeDistinctMatches(pairs);
    expect(result).toHaveLength(1);
    expect(result[0]!.score).toBe(95);
  });

  it("returns one match per non-overlapping pair", () => {
    const pairs = [
      { applicantId: "m1", partnerId: "w1", score: 85, dealbreakers: [] },
      { applicantId: "m2", partnerId: "w2", score: 75, dealbreakers: [] },
    ];
    const result = computeDistinctMatches(pairs);
    expect(result).toHaveLength(2);
  });
});

// ── buildCompatibleCohort ─────────────────────────────────────────────────────

describe("buildCompatibleCohort", () => {
  function makeScore(manId: string, womanId: string, score: number): PairScore {
    return { manId, womanId, score, dealbreakersViolated: [] };
  }

  it("returns empty cohort when no pairs pass minScore", () => {
    const men = [{ id: "m1" }, { id: "m2" }];
    const women = [{ id: "w1" }, { id: "w2" }];
    const scores: PairScore[] = [
      makeScore("m1", "w1", 50),
      makeScore("m1", "w2", 40),
      makeScore("m2", "w1", 30),
      makeScore("m2", "w2", 20),
    ];
    const result = buildCompatibleCohort(scores, men, women, 60);
    expect(result.menIds).toHaveLength(0);
    expect(result.womenIds).toHaveLength(0);
    expect(result.recommendations).toHaveLength(0);
  });

  it("builds a full cohort when all pairs pass", () => {
    const men = [{ id: "m1" }, { id: "m2" }];
    const women = [{ id: "w1" }, { id: "w2" }];
    const scores: PairScore[] = [
      makeScore("m1", "w1", 80),
      makeScore("m1", "w2", 75),
      makeScore("m2", "w1", 70),
      makeScore("m2", "w2", 65),
    ];
    const result = buildCompatibleCohort(scores, men, women, 60);
    expect(result.menIds).toHaveLength(2);
    expect(result.womenIds).toHaveLength(2);
    expect(result.recommendations).toHaveLength(4);
  });

  it("excludes a person who fails with all others", () => {
    // m2 fails with both women — should be excluded so cohort is m1×{w1,w2}
    const men = [{ id: "m1" }, { id: "m2" }];
    const women = [{ id: "w1" }, { id: "w2" }];
    const scores: PairScore[] = [
      makeScore("m1", "w1", 80),
      makeScore("m1", "w2", 75),
      makeScore("m2", "w1", 40), // fails
      makeScore("m2", "w2", 35), // fails
    ];
    const result = buildCompatibleCohort(scores, men, women, 60);
    expect(result.menIds).not.toContain("m2");
    expect(result.menIds).toContain("m1");
    expect(result.womenIds).toHaveLength(2);
  });

  it("excludes pairs with dealbreaker violations", () => {
    const men = [{ id: "m1" }];
    const women = [{ id: "w1" }];
    const scores: PairScore[] = [
      {
        manId: "m1",
        womanId: "w1",
        score: 90,
        dealbreakersViolated: ["q-dealbreaker"],
      },
    ];
    const result = buildCompatibleCohort(scores, men, women, 60);
    expect(result.menIds).toHaveLength(0);
    expect(result.womenIds).toHaveLength(0);
  });

  it("handles a completely disconnected graph (no one compatible with anyone)", () => {
    const men = [{ id: "m1" }, { id: "m2" }, { id: "m3" }];
    const women = [{ id: "w1" }, { id: "w2" }, { id: "w3" }];
    const scores: PairScore[] = men.flatMap((m) =>
      women.map((w) => makeScore(m.id, w.id, 0)),
    );
    const result = buildCompatibleCohort(scores, men, women, 60);
    expect(result.menIds).toHaveLength(0);
    expect(result.womenIds).toHaveLength(0);
  });

  it("prefers larger cohort over higher average score", () => {
    // 3 men × 3 women all pass at moderate scores → should pick 3×3 over
    // a hypothetical 1×1 at 100
    const men = [{ id: "m1" }, { id: "m2" }, { id: "m3" }];
    const women = [{ id: "w1" }, { id: "w2" }, { id: "w3" }];
    const scores: PairScore[] = men.flatMap((m) =>
      women.map((w) => makeScore(m.id, w.id, 65)),
    );
    const result = buildCompatibleCohort(scores, men, women, 60);
    expect(result.menIds).toHaveLength(3);
    expect(result.womenIds).toHaveLength(3);
  });

  it("returns recommendations only for cohort members", () => {
    const men = [{ id: "m1" }, { id: "m2" }];
    const women = [{ id: "w1" }, { id: "w2" }];
    // m2 fails with w2 — either m2 or w2 gets excluded from cohort
    const scores: PairScore[] = [
      makeScore("m1", "w1", 85),
      makeScore("m1", "w2", 80),
      makeScore("m2", "w1", 75),
      makeScore("m2", "w2", 30), // fails
    ];
    const result = buildCompatibleCohort(scores, men, women, 60);
    for (const rec of result.recommendations) {
      expect(result.menIds).toContain(rec.applicantId);
      expect(result.womenIds).toContain(rec.partnerId);
    }
  });
});

// ── Importance modulation ─────────────────────────────────────────────────────

describe("importance modulation in scorePairFromCache", () => {
  it("reduces effective weight when importance rating is low", () => {
    // Two questions: q-imp is the importance question for q-target
    // q-target: both answer the same (similarity = 1.0)
    // q-imp: both answer "1" (minimum importance) → factor ≈ 0.14
    // Without modulation the effective weight equals mlWeight;
    // with modulation it is mlWeight × (1+1)/2/7 = mlWeight × 1/7
    const qTarget = {
      ...makeQuestion("q-target", "Favorite music", "DROPDOWN", 1.0),
      importanceModifierForId: "q-imp",
    } as QuestionnaireQuestion;
    const qImp = makeQuestion("q-imp", "Music importance", "RADIO_7", 0.3);

    const questions = [qTarget, qImp];

    const aAnswers = answers([
      ["q-target", "Pop"],
      ["q-imp", 1], // very unimportant
    ]);
    const bAnswers = answers([
      ["q-target", "Pop"],
      ["q-imp", 1],
    ]);

    const result = scorePairFromCache(questions, aAnswers, bAnswers);
    const targetBreakdown = result.breakdown.find(
      (b) => b.questionId === "q-target",
    );
    expect(targetBreakdown).toBeDefined();
    // factor = (1+1)/2/7 ≈ 0.1429, so effectiveWeight ≈ 1.0 × 0.1429
    expect(targetBreakdown!.effectiveWeight).toBeCloseTo(1 / 7, 4);
    expect(targetBreakdown!.effectiveWeight).toBeLessThan(
      targetBreakdown!.weight,
    );
  });

  it("preserves full weight when importance rating is maximum (7)", () => {
    const qTarget = {
      ...makeQuestion("q-target", "Favorite music", "DROPDOWN", 1.0),
      importanceModifierForId: "q-imp",
    } as QuestionnaireQuestion;
    const qImp = makeQuestion("q-imp", "Music importance", "RADIO_7", 0.3);

    const questions = [qTarget, qImp];

    const aAnswers = answers([
      ["q-target", "Rock"],
      ["q-imp", 7], // maximum importance
    ]);
    const bAnswers = answers([
      ["q-target", "Rock"],
      ["q-imp", 7],
    ]);

    const result = scorePairFromCache(questions, aAnswers, bAnswers);
    const targetBreakdown = result.breakdown.find(
      (b) => b.questionId === "q-target",
    );
    expect(targetBreakdown!.effectiveWeight).toBeCloseTo(1.0, 5);
  });

  it("defaults to factor 1.0 when importance question is not answered", () => {
    const qTarget = {
      ...makeQuestion("q-target", "Favorite music", "DROPDOWN", 0.8),
      importanceModifierForId: "q-imp",
    } as QuestionnaireQuestion;
    const qImp = makeQuestion("q-imp", "Music importance", "RADIO_7", 0.3);

    const questions = [qTarget, qImp];

    // Neither applicant has answered q-imp
    const aAnswers = answers([["q-target", "Jazz"]]);
    const bAnswers = answers([["q-target", "Jazz"]]);

    const result = scorePairFromCache(questions, aAnswers, bAnswers);
    const targetBreakdown = result.breakdown.find(
      (b) => b.questionId === "q-target",
    );
    // When unanswered, valA and valB default to 7 → factor = (7+7)/2/7 = 1.0
    expect(targetBreakdown!.effectiveWeight).toBeCloseTo(0.8, 5);
  });
});

// ── preloadAnswerCache ────────────────────────────────────────────────────────

describe("preloadAnswerCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("groups answers by applicant ID and filters null values", async () => {
    const { db } = await import("@/lib/db");
    const mockQuestions = [
      makeQuestion("q1", "Question 1", "RADIO_7", 1.0),
      makeQuestion("q2", "Question 2", "RADIO_7", 0.5),
    ];
    const mockAnswers = [
      { applicantId: "a1", questionId: "q1", value: 5 },
      { applicantId: "a1", questionId: "q2", value: null }, // should be filtered
      { applicantId: "a2", questionId: "q1", value: 3 },
      { applicantId: "a2", questionId: "q2", value: 7 },
    ];

    vi.mocked(db.questionnaireQuestion.findMany).mockResolvedValue(
      mockQuestions as never,
    );
    vi.mocked(db.questionnaireAnswer.findMany).mockResolvedValue(
      mockAnswers as never,
    );

    const cache = await preloadAnswerCache(["a1", "a2"]);

    expect(cache.questions).toHaveLength(2);

    const a1Answers = cache.answersByApplicant.get("a1");
    expect(a1Answers?.get("q1")).toBe(5);
    expect(a1Answers?.has("q2")).toBe(false); // null was filtered

    const a2Answers = cache.answersByApplicant.get("a2");
    expect(a2Answers?.get("q1")).toBe(3);
    expect(a2Answers?.get("q2")).toBe(7);
  });

  it("builds a cross-pair index on load", async () => {
    const { db } = await import("@/lib/db");
    const mockQuestions = [
      makeQuestion("q-pets", "Do you have pets?", "RADIO_7", 0.5),
      makeQuestion(
        "q-pets-pref",
        "How do you feel about a partner having pets?",
        "RADIO_7",
        0.5,
      ),
    ];

    vi.mocked(db.questionnaireQuestion.findMany).mockResolvedValue(
      mockQuestions as never,
    );
    vi.mocked(db.questionnaireAnswer.findMany).mockResolvedValue([] as never);

    const cache = await preloadAnswerCache(["a1"]);
    expect(cache.crossPairIndex.resolved).toHaveLength(1);
    expect(cache.crossPairIndex.resolved[0]!.config.name).toBe("Pets");
  });

  it("returns empty maps for applicants with no answers", async () => {
    const { db } = await import("@/lib/db");

    vi.mocked(db.questionnaireQuestion.findMany).mockResolvedValue([] as never);
    vi.mocked(db.questionnaireAnswer.findMany).mockResolvedValue([] as never);

    const cache = await preloadAnswerCache(["a1"]);
    expect(cache.answersByApplicant.size).toBe(0);
    expect(cache.questions).toHaveLength(0);
  });
});
