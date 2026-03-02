/**
 * Test Matching Script
 *
 * Tests the matching algorithm against the February event to verify
 * that 15 maxPerGender produces 15 distinct 1:1 matches where every
 * cross-gender pair meets the compatibility threshold.
 *
 * Usage: npx tsx scripts/test-matching.ts
 */

import "dotenv/config";
import { db } from "../src/lib/db";
import {
  calculateWeightedCompatibility,
  preloadAnswerCache,
  scorePairFromCache,
  locationSimilarity,
} from "../src/lib/matching/weighted-compatibility";
import { ApplicationStatus, ScreeningStatus } from "@prisma/client";

const FEBRUARY_EVENT_ID =
  process.argv.find((a) => a.startsWith("--event="))?.split("=")[1] ??
  "cmlqropt800376v54xz2k7ovu";
const MIN_SCORE = 60;
const MAX_PER_GENDER = 15;
const LOCATION_ARG = process.argv.find((a) => a.startsWith("--location="));
const LOCATION_FILTER = LOCATION_ARG ? LOCATION_ARG.split("=")[1] : undefined;

function computeDistinctMatches(
  pairs: Array<{
    manId: string;
    manName: string;
    womanId: string;
    womanName: string;
    score: number;
  }>,
) {
  const sorted = [...pairs].sort((a, b) => b.score - a.score);
  const usedMen = new Set<string>();
  const usedWomen = new Set<string>();
  const result: typeof pairs = [];

  for (const pair of sorted) {
    if (!usedMen.has(pair.manId) && !usedWomen.has(pair.womanId)) {
      result.push(pair);
      usedMen.add(pair.manId);
      usedWomen.add(pair.womanId);
    }
  }

  return result;
}

async function main() {
  console.log("Testing matching for February event...");
  if (LOCATION_FILTER) {
    console.log(`Location filter: ${LOCATION_FILTER}`);
  }
  console.log();

  const applicants = await db.applicant.findMany({
    where: {
      applicationStatus: ApplicationStatus.APPROVED,
      screeningStatus: ScreeningStatus.PASSED,
      deletedAt: null,
      questionnaireAnswers: { some: {} },
      ...(LOCATION_FILTER ? { location: LOCATION_FILTER } : {}),
      eventInvitations: {
        some: {
          eventId: FEBRUARY_EVENT_ID,
          status: { notIn: ["DECLINED", "NO_SHOW"] },
        },
      },
    },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  const allMen = applicants.filter((a) => a.gender === "MAN");
  const allWomen = applicants.filter((a) => a.gender === "WOMAN");

  console.log(
    `Total invited: ${applicants.length} (${allMen.length}M + ${allWomen.length}W)`,
  );

  // Only process masstest users (to isolate from the old 48-persona seed)
  const men = allMen
    .filter((a) => a.user.email.endsWith("@masstest.reality.app"))
    .slice(0, MAX_PER_GENDER);
  const women = allWomen
    .filter((a) => a.user.email.endsWith("@masstest.reality.app"))
    .slice(0, MAX_PER_GENDER);

  console.log(
    `Using masstest users: ${men.length}M + ${women.length}W (capped at ${MAX_PER_GENDER})\n`,
  );

  console.log("Men:");
  for (const m of men) {
    console.log(`  ${m.user.firstName} ${m.user.lastName} (${m.user.email})`);
  }
  console.log("\nWomen:");
  for (const w of women) {
    console.log(`  ${w.user.firstName} ${w.user.lastName} (${w.user.email})`);
  }

  const pairCount = men.length * women.length;

  // ── Benchmark: old approach (1 DB query per pair) ──────────────────────
  console.log(
    `\n--- OLD approach: 1 DB query per pair (${pairCount} queries) ---`,
  );
  const oldStart = Date.now();
  for (const man of men) {
    for (const woman of women) {
      await calculateWeightedCompatibility(man.id, woman.id);
    }
  }
  const oldMs = Date.now() - oldStart;
  console.log(
    `  Completed in ${oldMs}ms (${(oldMs / pairCount).toFixed(1)}ms/pair)\n`,
  );

  // ── Benchmark: new batch approach (2 DB queries total) ─────────────────
  console.log(`--- NEW approach: batch preload + in-memory scoring ---`);
  const newStart = Date.now();
  const allIds = [...men.map((m) => m.id), ...women.map((w) => w.id)];
  const cache = await preloadAnswerCache(allIds);
  const cacheMs = Date.now() - newStart;
  console.log(
    `  Cache loaded in ${cacheMs}ms (${cache.questions.length} questions, ${allIds.length} applicants)`,
  );

  const LOCATION_WEIGHT = 0.1;
  const allPairs: Array<{
    manId: string;
    manName: string;
    womanId: string;
    womanName: string;
    score: number;
    dealbreakers: string[];
  }> = [];

  const scoreStart = Date.now();
  for (const man of men) {
    const manAnswers = cache.answersByApplicant.get(man.id) ?? new Map();
    for (const woman of women) {
      const womanAnswers = cache.answersByApplicant.get(woman.id) ?? new Map();
      const result = scorePairFromCache(
        cache.questions,
        manAnswers,
        womanAnswers,
      );
      let adjustedScore = result.score;
      if (
        result.dealbreakersViolated.length === 0 &&
        man.location &&
        woman.location
      ) {
        const locSim = locationSimilarity(man.location, woman.location);
        adjustedScore = Math.round(
          result.score * (1 - LOCATION_WEIGHT) + locSim * 100 * LOCATION_WEIGHT,
        );
      }
      allPairs.push({
        manId: man.id,
        manName: `${man.user.firstName} ${man.user.lastName}`,
        womanId: woman.id,
        womanName: `${woman.user.firstName} ${woman.user.lastName}`,
        score: adjustedScore,
        dealbreakers: result.dealbreakersViolated,
      });
    }
  }
  const scoreMs = Date.now() - scoreStart;
  const newTotalMs = Date.now() - newStart;
  console.log(
    `  Scored ${pairCount} pairs in ${scoreMs}ms (${(scoreMs / pairCount).toFixed(3)}ms/pair)`,
  );
  console.log(`  Total (cache + scoring): ${newTotalMs}ms`);
  console.log(`  Speedup: ${(oldMs / newTotalMs).toFixed(1)}x faster\n`);

  // Print matrix
  const wNames = women.map(
    (w) => `${w.user.firstName} ${w.user.lastName.charAt(0)}.`,
  );
  const headerRow = ["Men \\ Women", ...wNames].map((h) => h.padEnd(14));
  console.log(headerRow.join(""));
  console.log("-".repeat(headerRow.join("").length));

  for (const man of men) {
    const mName = `${man.user.firstName} ${man.user.lastName.charAt(0)}.`;
    const row = [mName.padEnd(14)];
    for (const woman of women) {
      const pair = allPairs.find(
        (p) => p.manId === man.id && p.womanId === woman.id,
      );
      const s = pair ? String(pair.score) : "-";
      row.push(s.padEnd(14));
    }
    console.log(row.join(""));
  }

  // Stats
  const passingPairs = allPairs.filter(
    (p) => p.score >= MIN_SCORE && p.dealbreakers.length === 0,
  );
  const scores = allPairs.map((p) => p.score);
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const min = Math.min(...scores);
  const max = Math.max(...scores);

  console.log(`\nAll pair stats:`);
  console.log(`  Total pairs: ${allPairs.length}`);
  console.log(`  Avg score: ${avg}`);
  console.log(`  Min score: ${min}`);
  console.log(`  Max score: ${max}`);
  console.log(
    `  Pairs >= ${MIN_SCORE}%: ${passingPairs.length} / ${allPairs.length}`,
  );

  // Distinct matches
  const distinctMatches = computeDistinctMatches(passingPairs);

  console.log(`\nDistinct (1:1) matches: ${distinctMatches.length}`);
  console.log("-".repeat(60));
  for (let i = 0; i < distinctMatches.length; i++) {
    const dm = distinctMatches[i]!;
    console.log(
      `  ${(i + 1).toString().padStart(2)}. ${dm.manName.padEnd(20)} <-> ${dm.womanName.padEnd(20)} Score: ${dm.score}`,
    );
  }

  // Validate: does every person in distinct matches have ALL their cross-gender
  // pairs above threshold?
  const distinctMenIds = new Set(distinctMatches.map((dm) => dm.manId));
  const distinctWomenIds = new Set(distinctMatches.map((dm) => dm.womanId));

  let allPairsValid = true;
  const failedPairs: typeof allPairs = [];

  for (const manId of distinctMenIds) {
    for (const womanId of distinctWomenIds) {
      const pair = allPairs.find(
        (p) => p.manId === manId && p.womanId === womanId,
      );
      if (!pair || pair.score < MIN_SCORE) {
        allPairsValid = false;
        if (pair) failedPairs.push(pair);
      }
    }
  }

  console.log(`\nCohort validation (all matched people cross-compatible):`);
  if (allPairsValid) {
    console.log(
      `  PASS - All ${distinctMatches.length}x${distinctMatches.length} cross-gender pairs >= ${MIN_SCORE}%`,
    );
  } else {
    console.log(
      `  FAIL - ${failedPairs.length} pairs below ${MIN_SCORE}% among matched individuals`,
    );
    for (const fp of failedPairs.slice(0, 10)) {
      console.log(`    ${fp.manName} <-> ${fp.womanName}: ${fp.score}`);
    }
  }

  console.log(
    `\nResult: ${distinctMatches.length >= MAX_PER_GENDER ? "SUCCESS" : "NEEDS MORE COMPATIBLE APPLICANTS"} - Got ${distinctMatches.length}/${MAX_PER_GENDER} distinct matches`,
  );

  await db.$disconnect();
}

main().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
