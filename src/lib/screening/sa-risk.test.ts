import { describe, it, expect } from "vitest";
import { FlagSeverity } from "@prisma/client";
import { evaluateSaRisk, SA_RISK_SIGNALS } from "./sa-risk";
import type { ResolvedSignal } from "./types";

function resolve(name: string, questionId: string): ResolvedSignal {
  const signal = SA_RISK_SIGNALS.find((s) => s.name === name);
  if (!signal) throw new Error(`Signal not found: ${name}`);
  return {
    signal,
    questionId,
    questionPrompt: `${name} prompt`,
  };
}

describe("evaluateSaRisk", () => {
  it("returns GREEN for non-concerning answers", () => {
    const resolvedSignals: ResolvedSignal[] = [
      resolve("Ex-blame pattern", "q1"),
      resolve("No self-awareness (traits)", "q2"),
      resolve("Feedback dismissal", "q3"),
    ];
    const answers = new Map<string, unknown>([
      ["q1", "We grew apart and I learned better communication."],
      ["q2", "I can be impatient. I am working on active listening."],
      ["q3", 2],
    ]);

    const result = evaluateSaRisk(resolvedSignals, answers);
    expect(result.flag).toBe(FlagSeverity.GREEN);
    expect(result.signals).toHaveLength(0);
  });

  it("returns YELLOW for one RED signal", () => {
    const resolvedSignals: ResolvedSignal[] = [
      resolve("Conflict escalation", "q1"),
    ];
    const answers = new Map<string, unknown>([
      ["q1", "Move against in defense"],
    ]);

    const result = evaluateSaRisk(resolvedSignals, answers);
    expect(result.flag).toBe(FlagSeverity.YELLOW);
    expect(result.signals[0]?.severity).toBe(FlagSeverity.RED);
  });

  it("returns RED for 2+ RED signals", () => {
    const resolvedSignals: ResolvedSignal[] = [
      resolve("Conflict escalation", "q1"),
      resolve("Partner control", "q2"),
    ];
    const answers = new Map<string, unknown>([
      ["q1", "Move against in defense"], // RED
      ["q2", "Changing my partner"], // RED
    ]);

    const result = evaluateSaRisk(resolvedSignals, answers);
    expect(result.flag).toBe(FlagSeverity.RED);
  });

  it("flags ex-blame narrative with derogatory and victim language", () => {
    const resolvedSignals: ResolvedSignal[] = [
      resolve("Ex-blame pattern", "q1"),
    ];
    const answers = new Map<string, unknown>([
      [
        "q1",
        "My ex was crazy and manipulative. I was the only one trying and did nothing wrong.",
      ],
    ]);

    const result = evaluateSaRisk(resolvedSignals, answers);
    expect(result.signals).toHaveLength(1);
    expect(result.signals[0]?.severity).toBe(FlagSeverity.RED);
    expect(result.signals[0]?.reason).toContain("red-flag patterns");
  });
});
