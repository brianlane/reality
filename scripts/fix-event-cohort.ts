/**
 * Fixes the February event cohort for location-based testing.
 *
 * 1. Shows current city distribution of invited applicants
 * 2. Reassigns all invited mass-test applicants to Phoenix, AZ
 * 3. Ensures we have 15M + 15W from Phoenix invited
 *
 * Usage: npx tsx scripts/fix-event-cohort.ts
 */

import "dotenv/config";
import { db } from "../src/lib/db";

const FEBRUARY_EVENT_ID = "cmlqropt800376v54xz2k7ovu";
const TARGET_CITY = "Phoenix, AZ";
const PER_GENDER = 15;

async function main() {
  // 1. Show current state
  const currentInvites = await db.eventInvitation.findMany({
    where: { eventId: FEBRUARY_EVENT_ID },
    include: {
      applicant: {
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  console.log(`Current event invitations: ${currentInvites.length}`);
  const cityDist: Record<string, number> = {};
  for (const inv of currentInvites) {
    const loc = inv.applicant.location || "unknown";
    cityDist[loc] = (cityDist[loc] ?? 0) + 1;
  }
  console.log("City distribution of invited:");
  for (const [city, count] of Object.entries(cityDist).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  ${city.padEnd(22)} ${count}`);
  }

  // 2. Remove all mass-test invitations
  const deleted = await db.eventInvitation.deleteMany({
    where: {
      eventId: FEBRUARY_EVENT_ID,
      applicant: { user: { email: { endsWith: "@masstest.reality.app" } } },
    },
  });
  console.log(`\nRemoved ${deleted.count} mass-test invitations`);

  // 3. Find Phoenix mass-test applicants
  const phoenixMen = await db.applicant.findMany({
    where: {
      location: TARGET_CITY,
      gender: "MAN",
      applicationStatus: "APPROVED",
      screeningStatus: "PASSED",
      deletedAt: null,
      user: { email: { endsWith: "@masstest.reality.app" } },
      questionnaireAnswers: { some: {} },
    },
    take: PER_GENDER,
    orderBy: { id: "asc" },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  const phoenixWomen = await db.applicant.findMany({
    where: {
      location: TARGET_CITY,
      gender: "WOMAN",
      applicationStatus: "APPROVED",
      screeningStatus: "PASSED",
      deletedAt: null,
      user: { email: { endsWith: "@masstest.reality.app" } },
      questionnaireAnswers: { some: {} },
    },
    take: PER_GENDER,
    orderBy: { id: "asc" },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  console.log(
    `\nPhoenix mass-test applicants available: ${phoenixMen.length}M + ${phoenixWomen.length}W`,
  );

  if (phoenixMen.length < PER_GENDER || phoenixWomen.length < PER_GENDER) {
    // Not enough from Phoenix alone — reassign some to Phoenix first
    console.log(
      `Need ${PER_GENDER} per gender but only have ${phoenixMen.length}M + ${phoenixWomen.length}W`,
    );
    console.log("Reassigning additional mass-test applicants to Phoenix...");

    const needMen = PER_GENDER - phoenixMen.length;
    const needWomen = PER_GENDER - phoenixWomen.length;

    if (needMen > 0) {
      const extraMen = await db.applicant.findMany({
        where: {
          location: { not: TARGET_CITY },
          gender: "MAN",
          applicationStatus: "APPROVED",
          screeningStatus: "PASSED",
          deletedAt: null,
          user: { email: { endsWith: "@masstest.reality.app" } },
          questionnaireAnswers: { some: {} },
        },
        take: needMen,
        orderBy: { id: "asc" },
      });
      for (const m of extraMen) {
        await db.applicant.update({
          where: { id: m.id },
          data: { location: TARGET_CITY },
        });
        phoenixMen.push(m as (typeof phoenixMen)[0]);
      }
      console.log(`  Reassigned ${extraMen.length} men to Phoenix`);
    }

    if (needWomen > 0) {
      const extraWomen = await db.applicant.findMany({
        where: {
          location: { not: TARGET_CITY },
          gender: "WOMAN",
          applicationStatus: "APPROVED",
          screeningStatus: "PASSED",
          deletedAt: null,
          user: { email: { endsWith: "@masstest.reality.app" } },
          questionnaireAnswers: { some: {} },
        },
        take: needWomen,
        orderBy: { id: "asc" },
      });
      for (const w of extraWomen) {
        await db.applicant.update({
          where: { id: w.id },
          data: { location: TARGET_CITY },
        });
        phoenixWomen.push(w as (typeof phoenixWomen)[0]);
      }
      console.log(`  Reassigned ${extraWomen.length} women to Phoenix`);
    }
  }

  // 4. Create invitations for Phoenix cohort
  const inviteeIds = [
    ...phoenixMen.slice(0, PER_GENDER).map((m) => m.id),
    ...phoenixWomen.slice(0, PER_GENDER).map((w) => w.id),
  ];

  const result = await db.eventInvitation.createMany({
    data: inviteeIds.map((applicantId) => ({
      eventId: FEBRUARY_EVENT_ID,
      applicantId,
      status: "ACCEPTED" as const,
    })),
    skipDuplicates: true,
  });

  console.log(
    `\nInvited ${result.count} Phoenix applicants (${Math.min(phoenixMen.length, PER_GENDER)}M + ${Math.min(phoenixWomen.length, PER_GENDER)}W)`,
  );

  // 5. Verify
  const finalInvites = await db.eventInvitation.findMany({
    where: { eventId: FEBRUARY_EVENT_ID },
    include: {
      applicant: {
        select: { location: true, gender: true },
      },
    },
  });

  const finalDist: Record<string, number> = {};
  let finalMen = 0,
    finalWomen = 0;
  for (const inv of finalInvites) {
    const loc = inv.applicant.location || "unknown";
    finalDist[loc] = (finalDist[loc] ?? 0) + 1;
    if (inv.applicant.gender === "MAN") finalMen++;
    else finalWomen++;
  }

  console.log(
    `\nFinal event invitations: ${finalInvites.length} (${finalMen}M + ${finalWomen}W)`,
  );
  console.log("Final city distribution:");
  for (const [city, count] of Object.entries(finalDist).sort(
    (a, b) => b[1] - a[1],
  )) {
    console.log(`  ${city.padEnd(22)} ${count}`);
  }

  await db.$disconnect();
}

main().catch((e) => {
  console.error("Failed:", e);
  process.exit(1);
});
