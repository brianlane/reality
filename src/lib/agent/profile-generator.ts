import { generateObject } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { agentModel, isAgentConfigured, AGENT_MODEL_ID } from "./gemini";

// Tier 1 dimensions the agent derives from the questionnaire. Structured
// summaries only — never raw narrative, never verbatim quotes at length.
const dimensionSchema = z.object({
  summary: z
    .string()
    .max(500)
    .describe("2-3 sentence structured summary of this dimension"),
  signals: z
    .array(z.string().max(120))
    .max(6)
    .describe("Short behavioral signals observed in the answers"),
  confidence: z
    .enum(["low", "medium", "high"])
    .describe("How much evidence the answers gave for this dimension"),
});

const profileDimensionsSchema = z.object({
  attachment: dimensionSchema.describe("Attachment style and closeness needs"),
  conflict: dimensionSchema.describe("Conflict style, repair attempts, boundaries"),
  values: dimensionSchema.describe("Core values, beliefs, life philosophy"),
  lifeArchitecture: dimensionSchema.describe(
    "Kids, location, career ambition, lifestyle, money psychology",
  ),
  readiness: dimensionSchema.describe("Relationship readiness and intent"),
  family: dimensionSchema.describe("Family background and current entanglement"),
});

export type ProfileDimensions = z.infer<typeof profileDimensionsSchema>;

const MAX_ANSWER_CHARS = 600;
const MAX_PROMPT_CHARS = 12000;

function formatAnswer(value: unknown, richText: string | null): string {
  const text =
    (typeof value === "string" && value.trim()) ||
    richText?.trim() ||
    (value == null ? "" : JSON.stringify(value));
  if (!text) return "[no answer]";
  return text.length > MAX_ANSWER_CHARS
    ? text.slice(0, MAX_ANSWER_CHARS) + "…"
    : text;
}

const SYSTEM_PROMPT = `You are the profiling engine for a curated matchmaking service. Given an applicant's questionnaire answers, derive structured Tier 1 compatibility dimensions.

Rules:
- Write summaries, not stories. Never repeat the applicant's history, traumas, or identifying details.
- Each dimension: a short summary plus 2-6 behavioral signals you actually observed in the answers.
- Set confidence honestly: "low" when the answers gave little evidence for a dimension. Never invent evidence.
- Output valid JSON matching the schema exactly. No extra text.`;

/**
 * Generate (or refresh) an applicant's AgentProfile from their
 * questionnaire answers. Idempotent: skips the LLM call when no answer
 * changed since the profile was generated. Never throws — safe for
 * fire-and-forget use after submission.
 */
export async function generateAgentProfile(
  applicantId: string,
): Promise<void> {
  if (!isAgentConfigured()) {
    logger.info("Agent profile generation skipped: Gemini not configured", {
      applicantId,
    });
    return;
  }

  try {
    const [answers, existing] = await Promise.all([
      db.questionnaireAnswer.findMany({
        where: { applicantId },
        include: {
          question: {
            select: {
              prompt: true,
              type: true,
              section: { select: { title: true } },
            },
          },
        },
        orderBy: { question: { order: "asc" } },
      }),
      db.agentProfile.findUnique({ where: { applicantId } }),
    ]);

    if (answers.length === 0) {
      logger.info("Agent profile generation skipped: no answers", {
        applicantId,
      });
      return;
    }

    // Idempotency: skip when nothing changed since the last generation.
    const latestAnswerAt = answers.reduce<Date | null>(
      (max, a) => (!max || a.updatedAt > max ? a.updatedAt : max),
      null,
    );
    if (
      existing?.generatedAt &&
      latestAnswerAt &&
      latestAnswerAt <= existing.generatedAt
    ) {
      logger.info("Agent profile up to date, skipping regeneration", {
        applicantId,
      });
      return;
    }

    const qaPairs = answers
      .map(
        (a) =>
          `Q [${a.question.section?.title ?? "General"}]: ${a.question.prompt}\nA: ${formatAnswer(a.value, a.richText)}`,
      )
      .join("\n\n");
    const prompt =
      qaPairs.length > MAX_PROMPT_CHARS
        ? qaPairs.slice(0, MAX_PROMPT_CHARS) + "\n\n[truncated]"
        : qaPairs;

    const { object: dimensions } = await generateObject({
      model: agentModel(),
      schema: profileDimensionsSchema,
      system: SYSTEM_PROMPT,
      prompt: `Applicant questionnaire answers:\n\n${prompt}`,
    });

    await db.agentProfile.upsert({
      where: { applicantId },
      update: {
        version: { increment: 1 },
        depth: "THIN",
        dimensions: dimensions as object,
        sources: { questionnaireAt: new Date().toISOString() },
        generatedAt: new Date(),
      },
      create: {
        applicantId,
        version: 1,
        depth: "THIN",
        dimensions: dimensions as object,
        sources: { questionnaireAt: new Date().toISOString() },
      },
    });

    logger.info("Agent profile generated", {
      applicantId,
      model: AGENT_MODEL_ID,
      answersUsed: answers.length,
    });
  } catch (err) {
    logger.error("Agent profile generation failed", {
      applicantId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
