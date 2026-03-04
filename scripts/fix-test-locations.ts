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

  // Group applicants by their assigned city (round-robin)
  const cityGroups = new Map<string, string[]>();
  for (const city of CITIES) cityGroups.set(city, []);

  for (let i = 0; i < testApplicants.length; i++) {
    const city = CITIES[i % CITIES.length]!;
    cityGroups.get(city)!.push(testApplicants[i]!.id);
  }

  // Batch update per city — 12 queries instead of N individual updates
  for (const [city, ids] of cityGroups) {
    if (ids.length === 0) continue;
    await db.applicant.updateMany({
      where: { id: { in: ids } },
      data: { location: city },
    });
  }

  console.log("Location distribution:");
  for (const [city, ids] of cityGroups) {
    console.log(`  ${city.padEnd(22)} ${ids.length}`);
  }

  console.log(`\nUpdated ${testApplicants.length} applicants.`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
