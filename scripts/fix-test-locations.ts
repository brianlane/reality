/**
 * Updates all test applicants to use cities from the canonical CITIES list.
 * Distributes applicants round-robin across all cities so every city has data.
 *
 * Usage: npx tsx scripts/fix-test-locations.ts
 */

import "dotenv/config";
import { db } from "../src/lib/db";
import { CITIES } from "../src/lib/locations";

async function main() {
  // Find all test applicants
  const testApplicants = await db.applicant.findMany({
    where: {
      user: {
        email: {
          endsWith: ".reality.app",
        },
      },
    },
    select: { id: true, location: true },
    orderBy: { id: "asc" },
  });

  console.log(`Found ${testApplicants.length} test applicants to update\n`);

  const counts: Record<string, number> = {};
  for (const city of CITIES) counts[city] = 0;

  for (let i = 0; i < testApplicants.length; i++) {
    const city = CITIES[i % CITIES.length]!;
    await db.applicant.update({
      where: { id: testApplicants[i]!.id },
      data: { location: city },
    });
    counts[city]!++;
  }

  console.log("Location distribution:");
  for (const [city, count] of Object.entries(counts)) {
    console.log(`  ${city.padEnd(22)} ${count}`);
  }

  console.log(`\nUpdated ${testApplicants.length} applicants.`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
