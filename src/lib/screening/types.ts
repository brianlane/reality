import { FlagSeverity, QuestionnaireQuestionType } from "@prisma/client";

export interface SignalResult {
  signalName: string;
  questionPrompt: string;
  severity: FlagSeverity;
  reason: string;
  rawValue: unknown;
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
