import { FlagSeverity, QuestionnaireQuestionType } from "@prisma/client";

export interface SignalResult {
  signalName: string;
  questionPrompt: string;
  severity: FlagSeverity;
  reason: string;
}

/**
 * Shared factory for SignalResult — kept here to avoid duplication across
 * relationship-readiness.ts and sa-risk.ts.
 * The prompt is left as "" at construction time; callers overwrite it
 * with the resolved question prompt after signal evaluation.
 */
export function makeSignalResult(
  name: string,
  prompt: string,
  severity: FlagSeverity,
  reason: string,
): SignalResult {
  return { signalName: name, questionPrompt: prompt, severity, reason };
}

export interface ScreeningResult {
  flag: FlagSeverity;
  signals: SignalResult[];
}

export interface ScreeningSignal {
  name: string;
  promptSubstring: string;
  questionType: QuestionnaireQuestionType;
  evaluate: (value: unknown) => SignalResult | null;
}

export interface ResolvedSignal {
  signal: ScreeningSignal;
  questionId: string;
  questionPrompt: string;
}

export interface FullScreeningResult {
  relationshipReadiness: ScreeningResult;
  saRisk: ScreeningResult;
}
