/**
 * Activates scoring for TEXT:number questions that previously had w=0.
 *
 * Date spending (cross-applicant pair):
 *   - "How much are you willing to spend on a first or second date?" → w=0.4
 *   - "How much are you expecting a potential partner to spend…" → w=0.4
 *   Scored as a cross-pair: A's willingness vs B's expectation (and vice
 *   versa), formula: min(1.0, willing / expected).
 *
 * Lifestyle proximity questions (independent numeric comparison):
 *   - "On average, how many hours per week do you dedicate to your
 *     professional endeavors…" → w=0.5, numericMaxDelta=60
 *   - "What is your daily average screen time?" → w=0.4, numericMaxDelta=10
 *   Scored by distance: 1 - |a - b| / maxDelta (capped at 0).
 *
 * Safe to re-run — idempotent.
 *
 * Usage: npx tsx scripts/seed-numeric-question-scoring.ts
 */

import "dotenv/config";
import { Prisma } from "@prisma/client";
import { db } from "../src/lib/db";

interface QuestionUpdate {
  promptSubstring: string;
  mlWeight: number;
  /** Merge into existing options JSON (leave null to not touch options) */
  optionsMerge?: Record<string, unknown>;
}

const UPDATES: QuestionUpdate[] = [
  // Date spending — cross-pair: weights activate the pair; scoring formula
  // is handled by CROSS_APPLICANT_PAIRS config in cross-pair-scoring.ts.
  {
    promptSubstring: "willing to spend on a first or second date",
    mlWeight: 0.4,
  },
  {
    promptSubstring:
      "expecting a potential partner to spend on a first or second date",
    mlWeight: 0.4,
  },
  // Work hours — lifestyle proximity; similar weekly hours = compatible.
  // maxDelta=60: two people 60+ hrs apart score 0 (e.g. 0 hrs vs 60 hrs).
  {
    promptSubstring:
      "how many hours per week do you dedicate to your professional endeavors",
    mlWeight: 0.5,
    optionsMerge: { numericMaxDelta: 60 },
  },
  // Screen time — lifestyle proximity; similar daily hours = compatible.
  // maxDelta=10: 0 hrs vs 10 hrs scores 0; 4 hrs vs 6 hrs scores 0.8.
  {
    promptSubstring: "daily average screen time",
    mlWeight: 0.4,
    optionsMerge: { numericMaxDelta: 10 },
  },
];

async function main() {
  console.log("Loading active questions from DB...\n");
  const allQuestions = await db.questionnaireQuestion.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, prompt: true, mlWeight: true, options: true },
  });

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const update of UPDATES) {
    const question = allQuestions.find((q) =>
      q.prompt.toLowerCase().includes(update.promptSubstring.toLowerCase()),
    );

    if (!question) {
      console.error(
        `✗ Could not find question matching: "${update.promptSubstring}"`,
      );
      errors++;
      continue;
    }

    // Build new options by merging into existing
    let newOptions = question.options as Record<string, unknown> | null;
    if (update.optionsMerge) {
      newOptions = { ...(newOptions ?? {}), ...update.optionsMerge };
    }

    const weightUnchanged = question.mlWeight === update.mlWeight;
    const optionsUnchanged =
      !update.optionsMerge ||
      JSON.stringify(question.options) === JSON.stringify(newOptions);

    if (weightUnchanged && optionsUnchanged) {
      console.log(`~ Already up to date: "${question.prompt.slice(0, 70)}"`);
      skipped++;
      continue;
    }

    await db.questionnaireQuestion.update({
      where: { id: question.id },
      data: {
        mlWeight: update.mlWeight,
        ...(update.optionsMerge
          ? { options: newOptions as Prisma.InputJsonValue }
          : {}),
      },
    });

    const details = [
      !weightUnchanged ? `w=${question.mlWeight} → ${update.mlWeight}` : null,
      update.optionsMerge
        ? `options += ${JSON.stringify(update.optionsMerge)}`
        : null,
    ]
      .filter(Boolean)
      .join(", ");

    console.log(`✓ Updated: "${question.prompt.slice(0, 70)}" (${details})`);
    updated++;
  }

  console.log("\n" + "─".repeat(60));
  console.log(
    `Done. Updated: ${updated} | Skipped: ${skipped} | Errors: ${errors}`,
  );

  if (errors > 0) {
    console.error(
      "\nSome questions could not be found. Check prompt substrings.",
    );
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
