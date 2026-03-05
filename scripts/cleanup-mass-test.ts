/**
 * Cleanup Mass Test Data
 *
 * Removes all @masstest.reality.app test users and their associated data.
 *
 * Usage: npx tsx scripts/cleanup-mass-test.ts
 */

import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  console.log("Cleaning up mass-test data...\n");

  const testUsers = await db.user.findMany({
    where: { email: { endsWith: "@masstest.reality.app" } },
    select: { id: true },
  });

  const testApplicants = await db.applicant.findMany({
    where: { user: { email: { endsWith: "@masstest.reality.app" } } },
    select: { id: true },
  });

  const applicantIds = testApplicants.map((a) => a.id);
  const userIds = testUsers.map((u) => u.id);

  console.log(
    `Found ${userIds.length} users and ${applicantIds.length} applicants to clean up`,
  );

  // Delete in order respecting foreign keys
  const matches = await db.match.deleteMany({
    where: {
      OR: [
        { applicantId: { in: applicantIds } },
        { partnerId: { in: applicantIds } },
      ],
    },
  });
  console.log(`  Deleted ${matches.count} matches`);

  const invitations = await db.eventInvitation.deleteMany({
    where: { applicantId: { in: applicantIds } },
  });
  console.log(`  Deleted ${invitations.count} event invitations`);

  const answers = await db.questionnaireAnswer.deleteMany({
    where: { applicantId: { in: applicantIds } },
  });
  console.log(`  Deleted ${answers.count} questionnaire answers`);

  const applicants = await db.applicant.deleteMany({
    where: { id: { in: applicantIds } },
  });
  console.log(`  Deleted ${applicants.count} applicants`);

  const users = await db.user.deleteMany({
    where: { id: { in: userIds } },
  });
  console.log(`  Deleted ${users.count} users`);

  console.log("\nCleanup complete!");
}

main()
  .catch((e) => {
    console.error("Cleanup failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
