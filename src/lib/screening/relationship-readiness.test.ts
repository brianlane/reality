import { describe, it, expect } from "vitest";
import { FlagSeverity } from "@prisma/client";
import {
  evaluateRelationshipReadiness,
  RELATIONSHIP_READINESS_SIGNALS,
} from "./relationship-readiness";
import type { ResolvedSignal } from "./types";

function resolve(name: string, questionId: string): ResolvedSignal {
  const signal = RELATIONSHIP_READINESS_SIGNALS.find((s) => s.name === name);
  if (!signal) throw new Error(`Signal not found: ${name}`);
  return {
    signal,
    questionId,
    questionPrompt: `${name} prompt`,
  };
}

describe("evaluateRelationshipReadiness", () => {
  it("returns GREEN when no red/yellow signals are triggered", () => {
    const resolvedSignals: ResolvedSignal[] = [
      resolve("Ex-attachment", "q1"),
      resolve("Life satisfaction", "q2"),
      resolve("Feedback reaction", "q3"),
    ];
    const answers = new Map<string, unknown>([
      ["q1", 2],
      ["q2", 6],
      ["q3", 2],
    ]);

    const result = evaluateRelationshipReadiness(resolvedSignals, answers);
    expect(result.flag).toBe(FlagSeverity.GREEN);
    expect(result.signals).toHaveLength(0);
  });

  it("returns YELLOW for one RED signal", () => {
    const resolvedSignals: ResolvedSignal[] = [resolve("Ex-attachment", "q1")];
    const answers = new Map<string, unknown>([["q1", 6]]);

    const result = evaluateRelationshipReadiness(resolvedSignals, answers);
    expect(result.flag).toBe(FlagSeverity.YELLOW);
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0]?.severity).toBe(FlagSeverity.RED);
  });

  it("returns RED for 3+ RED signals", () => {
    const resolvedSignals: ResolvedSignal[] = [
      resolve("Ex-attachment", "q1"),
      resolve("Life satisfaction", "q2"),
      resolve("Feedback reaction", "q3"),
    ];
    const answers = new Map<string, unknown>([
      ["q1", 6], // RED
      ["q2", 2], // RED
      ["q3", 6], // RED
    ]);

    const result = evaluateRelationshipReadiness(resolvedSignals, answers);
    expect(result.flag).toBe(FlagSeverity.RED);
    expect(
      result.signals.filter((s) => s.severity === FlagSeverity.RED).length,
    ).toBeGreaterThanOrEqual(3);
  });

  it("returns RED for 2 RED + 3 YELLOW", () => {
    const resolvedSignals: ResolvedSignal[] = [
      resolve("Ex-attachment", "q1"),
      resolve("Life satisfaction", "q2"),
      resolve("Emotional margin", "q3"),
      resolve("Stress response", "q4"),
      resolve("Therapy attitude", "q5"),
    ];
    const answers = new Map<string, unknown>([
      ["q1", 6], // RED
      ["q2", 2], // RED
      ["q3", "They would have to fit into gaps"], // YELLOW
      ["q4", "Withdraw and self-soothe first"], // YELLOW
      ["q5", "Not particularly"], // YELLOW
    ]);

    const result = evaluateRelationshipReadiness(resolvedSignals, answers);
    expect(result.flag).toBe(FlagSeverity.RED);
  });
});
