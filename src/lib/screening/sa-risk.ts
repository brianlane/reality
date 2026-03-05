import { FlagSeverity, QuestionnaireQuestionType } from "@prisma/client";
import type {
  ScreeningSignal,
  SignalResult,
  ScreeningResult,
  ResolvedSignal,
} from "./types";
import { makeSignalResult } from "./types";
import {
  DEROGATORY_EX_LABELS,
  BLAME_SHIFTING_MARKERS,
  SELF_VICTIMIZATION_MARKERS,
  ACCOUNTABILITY_INDICATORS,
  ABUSE_MINIMIZING_PATTERNS,
  countPatternMatches,
} from "./patterns";

export const SA_RISK_SIGNALS: ScreeningSignal[] = [
  {
    name: "Ex-blame pattern",
    promptSubstring: "Why did each one end",
    questionType: QuestionnaireQuestionType.TEXTAREA,
    evaluate(value) {
      const text = String(value ?? "").trim();
      if (!text) return null;

      const derogatory = countPatternMatches(text, DEROGATORY_EX_LABELS);
      const blame = countPatternMatches(text, BLAME_SHIFTING_MARKERS);
      const victim = countPatternMatches(text, SELF_VICTIMIZATION_MARKERS);
      const accountability = countPatternMatches(
        text,
        ACCOUNTABILITY_INDICATORS,
      );

      const negativeCount = derogatory.count + blame.count + victim.count;
      const hasAccountability = accountability.count > 0;

      if (hasAccountability && negativeCount <= 1) return null;

      const allMatched = [
        ...derogatory.matched,
        ...blame.matched,
        ...victim.matched,
      ];

      if (negativeCount >= 3)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.RED,
          `Multiple red-flag patterns detected (${allMatched.join(", ")})${hasAccountability ? " — some accountability noted but insufficient" : " — no accountability language present"}`,
        );
      if (negativeCount >= 1)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.YELLOW,
          `Concerning language detected (${allMatched.join(", ")})${hasAccountability ? " — some accountability noted" : " — no accountability language present"}`,
        );
      return null;
    },
  },
  {
    name: "No self-awareness (traits)",
    promptSubstring: "two negative personality traits",
    questionType: QuestionnaireQuestionType.TEXTAREA,
    evaluate(value) {
      const text = String(value ?? "").trim();

      if (!text || text.length < 5)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.RED,
          "Unable or unwilling to identify personal negative traits",
        );

      const blame = countPatternMatches(text, [
        ...BLAME_SHIFTING_MARKERS,
        "my ex",
        "my partner",
        "people around me",
        "others make me",
      ]);

      if (blame.count > 0)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.RED,
          `Deflects negative traits onto others (${blame.matched.join(", ")})`,
        );

      if (text.length < 20)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.YELLOW,
          "Very brief response — may indicate reluctance to self-reflect",
        );

      return null;
    },
  },
  {
    name: "Conflict escalation",
    promptSubstring: "first instinct to",
    questionType: QuestionnaireQuestionType.DROPDOWN,
    evaluate(value) {
      const s = String(value).toLowerCase();
      if (s.includes("move against"))
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.RED,
          "First instinct under hurt is to move against partner in defense",
        );
      return null;
    },
  },
  {
    name: "Energy matching",
    promptSubstring: "match the energy",
    questionType: QuestionnaireQuestionType.DROPDOWN,
    evaluate(value) {
      const s = String(value).toLowerCase();
      if (s.includes("match the energy"))
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.YELLOW,
          "Escalates arguments by matching energy rather than de-escalating",
        );
      return null;
    },
  },
  {
    name: "Feedback dismissal",
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
          `Score ${n}/7 — immediately dismisses feedback, views partner's voice as threat`,
        );
      if (n >= 5)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.YELLOW,
          `Score ${n}/7 — tends toward dismissing partner feedback`,
        );
      return null;
    },
  },
  {
    name: "Partner control",
    promptSubstring: "changing your boundaries or changing your partner",
    questionType: QuestionnaireQuestionType.DROPDOWN,
    evaluate(value) {
      const s = String(value).toLowerCase();
      if (s.includes("changing my partner") && !s.includes("both"))
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.RED,
          "Seeks to change partner rather than adjust own boundaries — control indicator",
        );
      return null;
    },
  },
  {
    name: "Never acceptable (minimizing)",
    promptSubstring: "never acceptable in a relationship",
    questionType: QuestionnaireQuestionType.TEXTAREA,
    evaluate(value) {
      const text = String(value ?? "").trim();
      if (!text) return null;

      const minimizing = countPatternMatches(text, ABUSE_MINIMIZING_PATTERNS);
      if (minimizing.count > 0)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.RED,
          `Uses minimizing language about relationship boundaries (${minimizing.matched.join(", ")})`,
        );
      return null;
    },
  },
  {
    name: "Relationship worry (controlling)",
    promptSubstring: "How much do you worry specifically in relationships",
    questionType: QuestionnaireQuestionType.RADIO_7,
    evaluate(value) {
      const n = Number(value);
      if (isNaN(n)) return null;
      if (n >= 6)
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.YELLOW,
          `Score ${n}/7 — extremely high relationship worry (potential for controlling behavior when combined with other signals)`,
        );
      return null;
    },
  },
  {
    name: "Forced immediate resolution",
    promptSubstring: "reset after",
    questionType: QuestionnaireQuestionType.DROPDOWN,
    evaluate(value) {
      const s = String(value).toLowerCase();
      if (s.includes("talk it out immediately"))
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.YELLOW,
          "Insists on immediate resolution — may indicate forced engagement during conflict",
        );
      return null;
    },
  },
  {
    name: "Bid rejection during conflict",
    promptSubstring: "bid for connection",
    questionType: QuestionnaireQuestionType.DROPDOWN,
    evaluate(value) {
      const s = String(value).toLowerCase();
      if (s.includes("distraction"))
        return makeSignalResult(
          this.name,
          "",
          FlagSeverity.YELLOW,
          "Views partner's bids for connection during conflict as distractions — may prioritize control over repair",
        );
      return null;
    },
  },
];

/**
 * Evaluate all SA risk signals against an applicant's answers.
 *
 * Uses more conservative aggregation (errs toward flagging):
 *  - 2+ RED signals → RED
 *  - 1 RED signal OR 3+ YELLOW → YELLOW
 *  - Otherwise → GREEN
 */
export function evaluateSaRisk(
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
  if (redCount >= 2) {
    flag = FlagSeverity.RED;
  } else if (redCount >= 1 || yellowCount >= 3) {
    flag = FlagSeverity.YELLOW;
  } else {
    flag = FlagSeverity.GREEN;
  }

  return { flag, signals };
}
