import { db } from "@/lib/db";
import { Prisma, QuestionnaireQuestion } from "@prisma/client";
import type {
  ScreeningSignal,
  ResolvedSignal,
  FullScreeningResult,
} from "./types";
import {
  RELATIONSHIP_READINESS_SIGNALS,
  evaluateRelationshipReadiness,
} from "./relationship-readiness";
import { SA_RISK_SIGNALS, evaluateSaRisk } from "./sa-risk";

/**
 * Resolve screening signals to actual question IDs by matching prompt substrings.
 * Same pattern as cross-pair-scoring.ts — resilient to DB reseeding.
 */
function resolveSignals(
  signals: ScreeningSignal[],
  questions: QuestionnaireQuestion[],
): ResolvedSignal[] {
  const resolved: ResolvedSignal[] = [];

  for (const signal of signals) {
    const question = questions.find((q) =>
      q.prompt.toLowerCase().includes(signal.promptSubstring.toLowerCase()),
    );
    if (!question) continue;

    resolved.push({
      signal,
      questionId: question.id,
      questionPrompt: question.prompt,
    });
  }

  return resolved;
}

/**
 * Compute both screening flag dimensions for an applicant.
 * Loads all active questions and the applicant's answers in two queries,
 * then runs both engines in-memory.
 */
export async function computeScreeningFlags(
  applicantId: string,
): Promise<FullScreeningResult> {
  const [questions, rawAnswers] = await Promise.all([
    db.questionnaireQuestion.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { order: "asc" },
    }),
    db.questionnaireAnswer.findMany({
      where: { applicantId },
      select: { questionId: true, value: true },
    }),
  ]);

  const answers = new Map<string, unknown>();
  for (const a of rawAnswers) {
    if (a.value !== null) {
      answers.set(a.questionId, a.value);
    }
  }

  const readinessSignals = resolveSignals(
    RELATIONSHIP_READINESS_SIGNALS,
    questions,
  );
  const saSignals = resolveSignals(SA_RISK_SIGNALS, questions);

  const relationshipReadiness = evaluateRelationshipReadiness(
    readinessSignals,
    answers,
  );
  const saRisk = evaluateSaRisk(saSignals, answers);

  return { relationshipReadiness, saRisk };
}

/**
 * Compute and persist screening flags for an applicant.
 * Returns the computed result after writing to the database.
 */
export async function computeAndStoreScreeningFlags(
  applicantId: string,
): Promise<FullScreeningResult> {
  const result = await computeScreeningFlags(applicantId);

  await db.applicant.update({
    where: { id: applicantId },
    data: {
      relationshipReadinessFlag: result.relationshipReadiness.flag,
      saScreeningFlag: result.saRisk.flag,
      screeningFlagDetails: {
        readiness: result.relationshipReadiness.signals,
        saRisk: result.saRisk.signals,
      } as unknown as Prisma.InputJsonValue,
      screeningFlagComputedAt: new Date(),
    },
  });

  return result;
}
