import { describe, expect, it } from "vitest";
import {
  parseDraftQuestionMetadata,
  verifyQuestionConfigAgainstDraft,
} from "./scoring";

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
