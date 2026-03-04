/**
 * Seeds importanceModifierForId links between importance questions and their
 * corresponding preference/practice questions in the database.
 *
 * Each target question gets its importanceModifierForId set to the ID of the
 * question that asks "how important is X to you" (RADIO_7 1–7). At scoring
 * time, the average of both applicants' importance ratings scales the
 * effective weight of the target question.
 *
 * Safe to re-run — idempotent.
 *
 * Usage: npx tsx scripts/seed-importance-pairs.ts
 */

import "dotenv/config";
import { db } from "../src/lib/db";

interface ImportancePairConfig {
  /** Substring that uniquely identifies the importance (modifier) question */
  importancePromptSubstring: string;
  /** Substrings identifying the target questions that should be modulated */
  targetPromptSubstrings: string[];
}

const IMPORTANCE_PAIRS: ImportancePairConfig[] = [
  // Page 14 Section C: Rate the Importance of Similarities
  {
    importancePromptSubstring: "Music taste with your partner",
    targetPromptSubstrings: ["Favorite genre of music"],
  },
  {
    importancePromptSubstring: "movie/tv genre compatibility with your partner",
    targetPromptSubstrings: ["Favorite movie"],
  },
  {
    importancePromptSubstring: "book genre compatibility with your partner",
    targetPromptSubstrings: ["Favorite book genre"],
  },
  {
    importancePromptSubstring: "type of activities preferred in your free time",
    targetPromptSubstrings: ["Favorite type of activity"],
  },
  // Page 14 Section A: Substance use importance → Page 11 Section C frequencies
  {
    importancePromptSubstring:
      "substance (alcohol/marijuana) use compatibility",
    targetPromptSubstrings: [
      "How often do you consume nicotine",
      "How often do you consume alcohol",
      "How often do you consume marijuana",
      "How often do you consume mushrooms",
    ],
  },
  // Page 14 Section B: Religious alignment importance → religion questions
  {
    importancePromptSubstring:
      "religious or spiritual alignment with your partner",
    targetPromptSubstrings: [
      "What is your religious or spiritual affiliation",
      "How many days per week do you participate in spiritual or religious",
      "Which religious or spiritual practices do you engage in",
    ],
  },
  // Page 12 Section A: Political alignment importance → political stance
  {
    importancePromptSubstring:
      "How important is political alignment with your partner",
    targetPromptSubstrings: ["How would you describe your political stance"],
  },
];

async function main() {
  console.log("Loading all active questions from DB...");
  const allQuestions = await db.questionnaireQuestion.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, prompt: true, importanceModifierForId: true },
  });

  console.log(`Found ${allQuestions.length} active questions.\n`);

  let updated = 0;
  let skipped = 0;
  const errors = 0;

  for (const pair of IMPORTANCE_PAIRS) {
    // Find the importance (modifier) question
    const importanceQuestion = allQuestions.find((q) =>
      q.prompt
        .toLowerCase()
        .includes(pair.importancePromptSubstring.toLowerCase()),
    );

    if (!importanceQuestion) {
      console.warn(
        `  ⚠ Importance question not yet in DB (will link when seeded): "${pair.importancePromptSubstring}"`,
      );
      continue;
    }

    console.log(
      `Importance question: "${importanceQuestion.prompt.slice(0, 70)}..."`,
    );
    console.log(`  ID: ${importanceQuestion.id}`);

    for (const targetSubstring of pair.targetPromptSubstrings) {
      const targetQuestion = allQuestions.find((q) =>
        q.prompt.toLowerCase().includes(targetSubstring.toLowerCase()),
      );

      if (!targetQuestion) {
        console.warn(
          `  ⚠ Target question not yet in DB (will link when seeded): "${targetSubstring}"`,
        );
        continue;
      }

      if (targetQuestion.importanceModifierForId === importanceQuestion.id) {
        console.log(
          `  ~ Already linked: "${targetQuestion.prompt.slice(0, 60)}..." (skipped)`,
        );
        skipped++;
        continue;
      }

      await db.questionnaireQuestion.update({
        where: { id: targetQuestion.id },
        data: { importanceModifierForId: importanceQuestion.id },
      });

      console.log(`  ✓ Linked: "${targetQuestion.prompt.slice(0, 60)}..."`);
      updated++;
    }

    console.log();
  }

  console.log("─".repeat(60));
  console.log(
    `Done. Updated: ${updated} | Skipped (already set): ${skipped} | Errors: ${errors}`,
  );

  if (errors > 0) {
    console.error(
      "\nSome links failed with unexpected errors. Check logs above.",
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
