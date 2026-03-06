import { describe, it, expect } from "vitest";
import {
  CROSS_APPLICANT_PAIRS,
  buildCrossPairIndex,
} from "./cross-pair-scoring";
import type { QuestionnaireQuestion } from "@prisma/client";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeQuestion(
  id: string,
  prompt: string,
  mlWeight = 0.5,
): QuestionnaireQuestion {
  return {
    id,
    prompt,
    mlWeight,
    type: "RADIO_7" as never,
    options: null,
    order: 0,
    isActive: true,
    isDealbreaker: false,
    deletedAt: null,
    importanceModifierForId: null,
  } as unknown as QuestionnaireQuestion;
}

// ── Date Spending ─────────────────────────────────────────────────────────────

describe("Date Spending cross-pair", () => {
  const pair = CROSS_APPLICANT_PAIRS.find((p) => p.name === "Date Spending")!;

  it("returns 1.0 when willing meets expectation exactly", () => {
    expect(pair.scoreOneSide(100, 100)).toBe(1.0);
  });

  it("returns 1.0 when willing exceeds expectation", () => {
    expect(pair.scoreOneSide(150, 100)).toBe(1.0);
  });

  it("returns proportional score when willing is below expectation", () => {
    expect(pair.scoreOneSide(50, 100)).toBe(0.5);
  });

  it("returns 1.0 when expected is 0 (no expectation)", () => {
    expect(pair.scoreOneSide(0, 0)).toBe(1.0);
  });

  it("returns 0.5 for non-numeric values", () => {
    expect(pair.scoreOneSide("N/A", "N/A")).toBe(0.5);
  });
});

// ── Pets ──────────────────────────────────────────────────────────────────────

describe("Pets cross-pair", () => {
  const pair = CROSS_APPLICANT_PAIRS.find((p) => p.name === "Pets")!;

  it("returns 1.0 when person has pets and partner loves pets", () => {
    expect(pair.scoreOneSide("Yes", "Very comfortable - I love pets")).toBe(
      1.0,
    );
  });

  it("returns 0.0 when person has pets and partner is very uncomfortable", () => {
    expect(
      pair.scoreOneSide(
        "Yes",
        "Very uncomfortable - I'm allergic or cannot accommodate",
      ),
    ).toBe(0.0);
  });

  it("returns 1.0 when person has no pets and partner is very uncomfortable", () => {
    expect(
      pair.scoreOneSide(
        "No",
        "Very uncomfortable - I'm allergic or cannot accommodate",
      ),
    ).toBe(1.0);
  });

  it("returns 0.5 when person has no pets and partner loves pets (mild unmet preference)", () => {
    expect(pair.scoreOneSide("No", "Very comfortable - I love pets")).toBe(0.5);
  });
});

// ── Children ──────────────────────────────────────────────────────────────────

describe("Children cross-pair", () => {
  const pair = CROSS_APPLICANT_PAIRS.find((p) => p.name === "Children")!;

  it("returns 1.0 when person has no children regardless of partner preference", () => {
    expect(pair.scoreOneSide("No", "No")).toBe(1.0);
    expect(pair.scoreOneSide("No", "Yes")).toBe(1.0);
    expect(pair.scoreOneSide("No", "It depends")).toBe(1.0);
  });

  it("returns 1.0 when person has children and partner is willing", () => {
    expect(pair.scoreOneSide("Yes", "Yes")).toBe(1.0);
  });

  it("returns 0.5 when person has children and partner says it depends", () => {
    expect(pair.scoreOneSide("Yes", "It depends")).toBe(0.5);
  });

  it("returns 0.0 when person has children and partner refuses", () => {
    expect(pair.scoreOneSide("Yes", "No")).toBe(0.0);
  });
});

// ── buildCrossPairIndex ───────────────────────────────────────────────────────

describe("buildCrossPairIndex", () => {
  const questions = [
    makeQuestion("q-pets-status", "Do you have pets?", 0.4),
    makeQuestion(
      "q-pets-pref",
      "How do you feel about a partner having pets?",
      0.3,
    ),
    makeQuestion("q-children-status", "Do you have children?", 0.4),
    makeQuestion(
      "q-children-pref",
      "Would you date someone with children?",
      0.3,
    ),
    makeQuestion("q-other", "What is your favorite color?", 0.2),
  ];

  it("resolves pets and children pairs", () => {
    const { resolved } = buildCrossPairIndex(questions);
    const names = resolved.map((r) => r.config.name);
    expect(names).toContain("Pets");
    expect(names).toContain("Children");
  });

  it("adds both question IDs to coveredIds", () => {
    const { coveredIds } = buildCrossPairIndex(questions);
    expect(coveredIds.has("q-pets-status")).toBe(true);
    expect(coveredIds.has("q-pets-pref")).toBe(true);
    expect(coveredIds.has("q-children-status")).toBe(true);
    expect(coveredIds.has("q-children-pref")).toBe(true);
    expect(coveredIds.has("q-other")).toBe(false);
  });

  it("skips a pair when one question is missing", () => {
    const partial = questions.filter((q) => q.id !== "q-pets-pref");
    const { resolved } = buildCrossPairIndex(partial);
    const names = resolved.map((r) => r.config.name);
    expect(names).not.toContain("Pets");
    expect(names).toContain("Children");
  });
});
