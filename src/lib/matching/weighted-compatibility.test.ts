import { describe, it, expect } from "vitest";
import {
  scorePairFromCache,
  computeDistinctMatches,
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
