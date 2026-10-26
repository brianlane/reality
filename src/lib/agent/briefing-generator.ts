import { generateObject } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { calculateWeightedCompatibility } from "@/lib/matching/weighted-compatibility";
import { agentModel, isAgentConfigured, AGENT_MODEL_ID } from "./gemini";

const briefingContentSchema = z.object({
  guidance: z
    .string()
    .max(600)
    .describe("One-paragraph framing for the reader of this briefing"),
  faultLines: z
    .array(
      z.object({
        title: z.string().max(80),
        detail: z.string().max(300),
      }),
    )
    .max(5)
    .describe(
      "Where this pairing will be tested, derived from real differences",
    ),
  threads: z
    .array(
      z.object({
        prompt: z
          .string()
          .max(140)
          .describe("A conversation opener or question"),
        why: z
          .string()
          .max(200)
          .describe("Why this thread matters for this pair"),
      }),
    )
    .max(5)
    .describe("Conversation threads worth opening early"),
});

export type BriefingContent = z.infer<typeof briefingContentSchema>;

const SYSTEM_PROMPT = `You are the briefing engine for a curated matchmaking service. Given two applicants' agent profiles (structured Tier 1 summaries) and their compatibility engine output, write a briefing.

Rules:
- Diagnose, don't decide. Name where the pairing will be tested and which conversations matter early. Never predict success or failure.
- Ground every fault line in a real difference between the two profiles or a low subscore — never invent tension.
- Threads must be specific to this pair, not generic date advice.
- Warm, direct tone. No clinical language, no therapy-speak.
- Output valid JSON matching the schema exactly. No extra text.`;

type GenerateBriefingInput = {
  applicantId: string;
  candidateId: string;
  matchId?: string;
  audience: "CURATOR" | "APPLICANT";
};

/**
 * Generate a compatibility briefing for a pair. Consumes the weighted
 * compatibility engine output (score, dealbreakers, per-question
 * breakdown) and narrates it into fault lines + conversation threads.
 * Saves a Briefing row and returns it. Throws on failure — callers decide
 * how to handle (the admin endpoint surfaces the error).
 */
export async function generateBriefing(input: GenerateBriefingInput) {
  const { applicantId, candidateId, matchId, audience } = input;

  if (!isAgentConfigured()) {
    throw new Error(
      "Gemini API key not configured (GOOGLE_GENERATIVE_AI_API_KEY)",
    );
  }

  const [profileA, profileB, scoring] = await Promise.all([
    db.agentProfile.findUnique({ where: { applicantId } }),
    db.agentProfile.findUnique({ where: { applicantId: candidateId } }),
    calculateWeightedCompatibility(applicantId, candidateId),
  ]);

  if (!profileA) {
    throw new Error(`No agent profile for applicant ${applicantId}`);
  }

  // Weakest dimensions by subscore — the most diagnostic signal.
  const weakSpots = [...scoring.breakdown]
    .sort((a, b) => a.weightedScore - b.weightedScore)
    .slice(0, 6)
    .map((b) => ({
      question: b.prompt,
      score: Math.round(b.weightedScore * 100) / 100,
      weight: b.weight,
    }));

  const prompt = [
    `Applicant A profile (Tier 1 dimensions):`,
    JSON.stringify(profileA.dimensions ?? {}, null, 1),
    candidateId && profileB
      ? `\nApplicant B profile (Tier 1 dimensions):\n${JSON.stringify(profileB.dimensions ?? {}, null, 1)}`
      : `\nApplicant B has no agent profile yet — brief on Applicant A alone, noting the gap.`,
    `\nCompatibility engine: score ${Math.round(scoring.score)}/100 across ${scoring.questionsScored} questions.`,
    scoring.dealbreakersViolated.length > 0
      ? `Dealbreakers violated: ${scoring.dealbreakersViolated.join(", ")}`
      : `No dealbreakers violated.`,
    `\nWeakest dimensions:\n${JSON.stringify(weakSpots, null, 1)}`,
    `\nAudience: ${audience}. ${audience === "CURATOR" ? "Write for a professional matchmaker: candid, specific, decision-useful." : "Write for the applicant: warm, encouraging, never clinical. Do not mention scores or percentages."}`,
  ].join("\n");

  const { object: content } = await generateObject({
    model: agentModel(),
    schema: briefingContentSchema,
    system: SYSTEM_PROMPT,
    prompt,
  });

  const briefing = await db.briefing.create({
    data: {
      applicantId,
      agentProfileId: profileA.id,
      matchId: matchId ?? null,
      audience,
      content: {
        ...content,
        ...(audience === "CURATOR"
          ? { compatibilityScore: Math.round(scoring.score) }
          : {}),
      } as object,
      model: AGENT_MODEL_ID,
    },
  });

  logger.info("Briefing generated", {
    applicantId,
    candidateId,
    audience,
    briefingId: briefing.id,
    model: AGENT_MODEL_ID,
  });

  return briefing;
}
