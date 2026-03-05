/**
 * Fixes the compatible cohort: moves the original first-15-per-gender
 * mass-test applicants (created with compatibleProfile) to Phoenix
 * and invites them to the February event.
 *
 * Usage: npx tsx scripts/fix-cohort-phoenix.ts
 */

import "dotenv/config";
import { db } from "../src/lib/db";

const FEBRUARY_EVENT_ID =
  process.argv.find((a) => a.startsWith("--event="))?.split("=")[1] ??
  "cmlqropt800376v54xz2k7ovu";
const TARGET_CITY = "Phoenix, AZ";
const PER_GENDER = 15;

async function main() {
  // The compatible cohort was created first (lowest IDs) in each gender
  const allMassMen = await db.applicant.findMany({
    where: {
      gender: "MAN",
      user: { email: { endsWith: "@masstest.reality.app" } },
      applicationStatus: "APPROVED",
      questionnaireAnswers: { some: {} },
    },
    orderBy: { createdAt: "asc" },
    take: PER_GENDER,
    select: { id: true, location: true },
  });

  const allMassWomen = await db.applicant.findMany({
    where: {
      gender: "WOMAN",
      user: { email: { endsWith: "@masstest.reality.app" } },
      applicationStatus: "APPROVED",
      questionnaireAnswers: { some: {} },
    },
    orderBy: { createdAt: "asc" },
    take: PER_GENDER,
    select: { id: true, location: true },
  });

  console.log(
    `Compatible cohort: ${allMassMen.length}M + ${allMassWomen.length}W`,
  );
  console.log("Current locations:");
  for (const m of allMassMen)
    console.log(`  M ${m.id.slice(0, 8)} -> ${m.location}`);
  for (const w of allMassWomen)
    console.log(`  W ${w.id.slice(0, 8)} -> ${w.location}`);

  // Move them all to Phoenix
  const cohortIds = [
    ...allMassMen.map((m) => m.id),
    ...allMassWomen.map((w) => w.id),
  ];
  const updated = await db.applicant.updateMany({
    where: { id: { in: cohortIds } },
    data: { location: TARGET_CITY },
  });
  console.log(`\nMoved ${updated.count} applicants to ${TARGET_CITY}`);

  // Remove old mass-test invitations
  const deleted = await db.eventInvitation.deleteMany({
    where: {
      eventId: FEBRUARY_EVENT_ID,
      applicant: { user: { email: { endsWith: "@masstest.reality.app" } } },
    },
  });
  console.log(`Removed ${deleted.count} old mass-test invitations`);

  // Invite the compatible cohort
  const result = await db.eventInvitation.createMany({
    data: cohortIds.map((applicantId) => ({
      eventId: FEBRUARY_EVENT_ID,
      applicantId,
      status: "ACCEPTED" as const,
    })),
    skipDuplicates: true,
  });
  console.log(`Invited ${result.count} compatible cohort members`);

  // Verify
  const finalInvites = await db.eventInvitation.count({
    where: { eventId: FEBRUARY_EVENT_ID },
  });
  const phoenixCount = await db.applicant.count({
    where: {
      location: TARGET_CITY,
      user: { email: { endsWith: ".reality.app" } },
    },
  });
  console.log(`\nTotal event invitations: ${finalInvites}`);
  console.log(`Total Phoenix test applicants: ${phoenixCount}`);
}

main()
  .catch((e) => {
    console.error("Failed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
