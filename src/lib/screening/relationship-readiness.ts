import { FlagSeverity, QuestionnaireQuestionType } from "@prisma/client";
import type {
  ScreeningSignal,
  SignalResult,
  ScreeningResult,
  ResolvedSignal,
} from "./types";

function makeSignalResult(
  name: string,
  prompt: string,
  severity: FlagSeverity,
  reason: string,
  rawValue: unknown,
): SignalResult {
  return {
    signalName: name,
    questionPrompt: prompt,
    severity,
    reason,
    rawValue,
  };
}

export const RELATIONSHIP_READINESS_SIGNALS: ScreeningSignal[] = [
  {
    name: "Ex-attachment",
    promptSubstring: "unexpectedly reminds you of an ex-partner",
    questionType: QuestionnaireQuestionType.RADIO_7,
    evaluate(value) {
      const n = Number(value);
      if (isNaN(n)) return null;
      if (n >= 6)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.RED,
          `Score ${n}/7 — still significantly pulled out of the present by ex reminders`,
          value,
        );
      if (n >= 5)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.YELLOW,
          `Score ${n}/7 — moderately affected by ex reminders`,
          value,
        );
      return null;
    },
  },
  {
    name: "Life satisfaction",
    promptSubstring: "How satisfied are you with your life and hobbies",
    questionType: QuestionnaireQuestionType.RADIO_7,
    evaluate(value) {
      const n = Number(value);
      if (isNaN(n)) return null;
      if (n <= 2)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.RED,
          `Score ${n}/7 — very low life satisfaction may indicate unreadiness`,
          value,
        );
      if (n <= 3)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.YELLOW,
          `Score ${n}/7 — below-average life satisfaction`,
          value,
        );
      return null;
    },
  },
  {
    name: "Emotional margin",
    promptSubstring: "physical and emotional margin",
    questionType: QuestionnaireQuestionType.DROPDOWN,
    evaluate(value) {
      const s = String(value).toLowerCase();
      if (s.includes("fit into") || s.includes("gaps"))
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.YELLOW,
          "Partner would have to fit into gaps of an over-scheduled life",
          value,
        );
      return null;
    },
  },
  {
    name: "Stress response",
    promptSubstring: "sudden, stressful life event",
    questionType: QuestionnaireQuestionType.DROPDOWN,
    evaluate(value) {
      const s = String(value).toLowerCase();
      if (s.includes("withdraw") && s.includes("self-soothe"))
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.YELLOW,
          "Exclusively withdraws under stress — possible avoidant pattern",
          value,
        );
      return null;
    },
  },
  {
    name: "Feedback reaction",
    promptSubstring: "partner points out a behavior of yours",
    questionType: QuestionnaireQuestionType.RADIO_7,
    evaluate(value) {
      const n = Number(value);
      if (isNaN(n)) return null;
      if (n >= 6)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.RED,
          `Score ${n}/7 — immediately dismisses partner feedback, indicating emotional rigidity`,
          value,
        );
      if (n >= 5)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.YELLOW,
          `Score ${n}/7 — tends to dismiss partner feedback`,
          value,
        );
      return null;
    },
  },
  {
    name: "Emotional suppression",
    promptSubstring: "keep them to myself rather than express",
    questionType: QuestionnaireQuestionType.RADIO_7,
    evaluate(value) {
      const n = Number(value);
      if (isNaN(n)) return null;
      if (n >= 6)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.YELLOW,
          `Score ${n}/7 — strong tendency to suppress emotions`,
          value,
        );
      return null;
    },
  },
  {
    name: "Hobby tolerance",
    promptSubstring:
      "comfortable are you if your partner spends the majority of their free time on a hobby",
    questionType: QuestionnaireQuestionType.RADIO_7,
    evaluate(value) {
      const n = Number(value);
      if (isNaN(n)) return null;
      if (n <= 2)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.RED,
          `Score ${n}/7 — very low tolerance for partner's independent hobbies (enmeshment risk)`,
          value,
        );
      if (n <= 3)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.YELLOW,
          `Score ${n}/7 — low tolerance for partner's independent hobbies`,
          value,
        );
      return null;
    },
  },
  {
    name: "Separate interests frustration",
    promptSubstring: "frustration for you if a partner spent a weekend",
    questionType: QuestionnaireQuestionType.DROPDOWN,
    evaluate(value) {
      const s = String(value).toLowerCase().trim();
      if (s === "yes")
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.YELLOW,
          "Frustrated by partner spending a weekend on personal interests",
          value,
        );
      return null;
    },
  },
  {
    name: "Partner autonomy",
    promptSubstring: "partner possesses a world of their own",
    questionType: QuestionnaireQuestionType.RADIO_7,
    evaluate(value) {
      const n = Number(value);
      if (isNaN(n)) return null;
      if (n <= 2)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.RED,
          `Score ${n}/7 — doesn't value partner having independent identity`,
          value,
        );
      if (n <= 3)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.YELLOW,
          `Score ${n}/7 — low value on partner's independent identity`,
          value,
        );
      return null;
    },
  },
  {
    name: "Partner as everything",
    promptSubstring: "partner is responsible for being your everything",
    questionType: QuestionnaireQuestionType.DROPDOWN,
    evaluate(value) {
      const s = String(value).toLowerCase();
      if (s.includes("partner is my everything"))
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.YELLOW,
          "Expects partner to fulfill all emotional and social needs (enmeshment risk)",
          value,
        );
      return null;
    },
  },
  {
    name: "Social support (friends)",
    promptSubstring: "friends I can count on",
    questionType: QuestionnaireQuestionType.RADIO_7,
    evaluate(value) {
      const n = Number(value);
      if (isNaN(n)) return null;
      if (n <= 2)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.RED,
          `Score ${n}/7 — very low friend support network`,
          value,
        );
      if (n <= 3)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.YELLOW,
          `Score ${n}/7 — limited friend support network`,
          value,
        );
      return null;
    },
  },
  {
    name: "Social support (sharing)",
    promptSubstring: "people in my life to share",
    questionType: QuestionnaireQuestionType.RADIO_7,
    evaluate(value) {
      const n = Number(value);
      if (isNaN(n)) return null;
      if (n <= 2)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.RED,
          `Score ${n}/7 — very few people to share happiness and emotions with`,
          value,
        );
      if (n <= 3)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.YELLOW,
          `Score ${n}/7 — limited emotional sharing network`,
          value,
        );
      return null;
    },
  },
  {
    name: "Social support (satisfaction)",
    promptSubstring: "satisfied with the level of social support",
    questionType: QuestionnaireQuestionType.RADIO_7,
    evaluate(value) {
      const n = Number(value);
      if (isNaN(n)) return null;
      if (n <= 2)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.RED,
          `Score ${n}/7 — very dissatisfied with social support level`,
          value,
        );
      if (n <= 3)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.YELLOW,
          `Score ${n}/7 — below-average satisfaction with social support`,
          value,
        );
      return null;
    },
  },
  {
    name: "Self-knowledge",
    promptSubstring: "How well do you think you know yourself",
    questionType: QuestionnaireQuestionType.RADIO_7,
    evaluate(value) {
      const n = Number(value);
      if (isNaN(n)) return null;
      if (n <= 2)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.RED,
          `Score ${n}/7 — very low self-awareness`,
          value,
        );
      if (n <= 3)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.YELLOW,
          `Score ${n}/7 — limited self-awareness`,
          value,
        );
      return null;
    },
  },
  {
    name: "Changing partner",
    promptSubstring: "changing your boundaries or changing your partner",
    questionType: QuestionnaireQuestionType.DROPDOWN,
    evaluate(value) {
      const s = String(value).toLowerCase();
      if (s.includes("changing my partner") && !s.includes("both"))
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.RED,
          "Would change their partner rather than adapt their own boundaries",
          value,
        );
      if (s === "both")
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.YELLOW,
          "Mixed approach — may attempt to change partner alongside own boundaries",
          value,
        );
      return null;
    },
  },
  {
    name: "Therapy attitude",
    promptSubstring: "therapy-positive",
    questionType: QuestionnaireQuestionType.DROPDOWN,
    evaluate(value) {
      const s = String(value).toLowerCase();
      if (s.includes("not particularly"))
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.YELLOW,
          "Not therapy-positive — may resist emotional self-regulation work",
          value,
        );
      return null;
    },
  },
];

/**
 * Evaluate all relationship readiness signals against an applicant's answers.
 *
 * Aggregation:
 *  - 3+ RED signals OR (2 RED + 3+ YELLOW) → RED
 *  - 1-2 RED signals OR 4+ YELLOW → YELLOW
 *  - Otherwise → GREEN
 */
export function evaluateRelationshipReadiness(
  resolvedSignals: ResolvedSignal[],
  answers: Map<string, unknown>,
): ScreeningResult {
  const signals: SignalResult[] = [];

  for (const { signal, questionId, questionPrompt } of resolvedSignals) {
    const value = answers.get(questionId);
    if (value === undefined) continue;

    const result = signal.evaluate(value);
    if (result) {
      result.questionPrompt = questionPrompt;
      signals.push(result);
    }
  }

  const redCount = signals.filter(
    (s) => s.severity === FlagSeverity.RED,
  ).length;
  const yellowCount = signals.filter(
    (s) => s.severity === FlagSeverity.YELLOW,
  ).length;

  let flag: FlagSeverity;
  if (redCount >= 3 || (redCount >= 2 && yellowCount >= 3)) {
    flag = FlagSeverity.RED;
  } else if (redCount >= 1 || yellowCount >= 4) {
    flag = FlagSeverity.YELLOW;
  } else {
    flag = FlagSeverity.GREEN;
  }

  return { flag, signals };
}
