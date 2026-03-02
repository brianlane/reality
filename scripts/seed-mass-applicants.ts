/**
 * Seed Mass Applicants Script
 *
 * Creates ~1000 synthetic test personas (500 men + 500 women)
 * with varied questionnaire answers and invites the first 15 of each
 * gender to the February event for matching validation.
 *
 * Usage: npx tsx scripts/seed-mass-applicants.ts
 *
 * DATA SAFETY:
 * - Only creates new records — never modifies existing data
 * - Test users use @masstest.reality.app emails and masstest_* clerkIds
 * - Idempotent: skips any test users that already exist
 * - EventInvitations use skipDuplicates: true
 */

import "dotenv/config";
import { db } from "../src/lib/db";
import type {
  QuestionnaireQuestionType,
  QuestionnaireQuestion,
} from "@prisma/client";

const FEBRUARY_EVENT_ID =
  process.argv.find((a) => a.startsWith("--event="))?.split("=")[1] ??
  "cmlqropt800376v54xz2k7ovu";

const TARGET_MEN = 500;
const TARGET_WOMEN = 500;
const INVITE_PER_GENDER = 15;

// Seeded PRNG for reproducible results
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(42);

function clamp(v: number, lo = 0, hi = 1) {
  return Math.min(hi, Math.max(lo, v));
}

const MALE_FIRST = [
  "James",
  "Robert",
  "John",
  "Michael",
  "David",
  "William",
  "Richard",
  "Thomas",
  "Daniel",
  "Matthew",
  "Andrew",
  "Joshua",
  "Christopher",
  "Joseph",
  "Anthony",
  "Mark",
  "Steven",
  "Paul",
  "Kevin",
  "Brian",
  "Jason",
  "Eric",
  "Ryan",
  "Nathan",
  "Tyler",
  "Kyle",
  "Jacob",
  "Noah",
  "Ethan",
  "Lucas",
  "Mason",
  "Logan",
  "Aiden",
  "Jack",
  "Owen",
  "Caleb",
  "Isaac",
  "Liam",
  "Henry",
  "Carter",
  "Sebastian",
  "Miles",
  "Dominic",
  "Gavin",
  "Hunter",
  "Elijah",
  "Benjamin",
  "Samuel",
  "Aaron",
  "Adrian",
];

const FEMALE_FIRST = [
  "Mary",
  "Patricia",
  "Jennifer",
  "Linda",
  "Elizabeth",
  "Barbara",
  "Susan",
  "Jessica",
  "Sarah",
  "Karen",
  "Lisa",
  "Nancy",
  "Betty",
  "Margaret",
  "Sandra",
  "Ashley",
  "Dorothy",
  "Kimberly",
  "Emily",
  "Donna",
  "Rachel",
  "Laura",
  "Megan",
  "Hannah",
  "Sophia",
  "Olivia",
  "Emma",
  "Ava",
  "Isabella",
  "Lily",
  "Grace",
  "Chloe",
  "Zoe",
  "Riley",
  "Natalie",
  "Hazel",
  "Violet",
  "Stella",
  "Aria",
  "Luna",
  "Ivy",
  "Maya",
  "Claire",
  "Audrey",
  "Leah",
  "Savannah",
  "Penelope",
  "Madelyn",
  "Paisley",
  "Bella",
];

const LAST_NAMES = [
  "Smith",
  "Johnson",
  "Williams",
  "Brown",
  "Jones",
  "Garcia",
  "Miller",
  "Davis",
  "Rodriguez",
  "Martinez",
  "Anderson",
  "Taylor",
  "Thomas",
  "Jackson",
  "White",
  "Harris",
  "Martin",
  "Thompson",
  "Robinson",
  "Clark",
  "Lewis",
  "Lee",
  "Walker",
  "Hall",
  "Allen",
  "Young",
  "King",
  "Wright",
  "Scott",
  "Green",
  "Baker",
  "Adams",
  "Nelson",
  "Hill",
  "Ramirez",
  "Campbell",
  "Mitchell",
  "Roberts",
  "Carter",
  "Phillips",
  "Evans",
  "Turner",
  "Torres",
  "Parker",
  "Collins",
  "Edwards",
  "Stewart",
  "Flores",
  "Morris",
  "Murphy",
  "Cook",
  "Rogers",
  "Morgan",
  "Peterson",
  "Cooper",
  "Reed",
  "Bailey",
  "Bell",
  "Gomez",
  "Kelly",
  "Howard",
  "Ward",
  "Cox",
  "Diaz",
  "Richardson",
  "Wood",
  "Watson",
  "Brooks",
  "Bennett",
  "Gray",
  "James",
  "Reyes",
  "Cruz",
  "Hughes",
  "Price",
  "Myers",
  "Long",
  "Foster",
  "Sanders",
  "Ross",
  "Morales",
  "Powell",
  "Sullivan",
  "Russell",
  "Ortiz",
  "Jenkins",
  "Gutierrez",
  "Perry",
  "Butler",
  "Barnes",
  "Fisher",
  "Henderson",
  "Coleman",
  "Simmons",
  "Patterson",
  "Jordan",
  "Reynolds",
  "Hamilton",
  "Graham",
  "Kim",
];

const LOCATIONS = [
  "Phoenix",
  "Scottsdale",
  "Tempe",
  "Mesa",
  "Chandler",
  "Gilbert",
  "Glendale",
  "Peoria",
];

const EDUCATION = [
  "High School Diploma",
  "Associate's Degree",
  "Bachelor's Degree",
  "Master's Degree",
  "Doctoral Degree",
];

const INCOME = [
  "$25,000–$49,999",
  "$50,000–$74,999",
  "$75,000–$99,999",
  "$100,000–$149,999",
  "$150,000+",
];

interface GeneratedProfile {
  bias: number;
  wantsKids: string;
  smoking: string;
  relocationBias: number;
  touchBias: number;
  religionBias: number;
  noNoise?: boolean;
}

function randomProfile(): GeneratedProfile {
  const bias = rng();
  return {
    bias,
    wantsKids: rng() < 0.4 ? "Yes" : rng() < 0.7 ? "Maybe" : "No",
    smoking: rng() < 0.6 ? "Never" : rng() < 0.8 ? "Socially" : "Rarely",
    relocationBias: rng(),
    touchBias: rng(),
    religionBias: rng(),
  };
}

/**
 * Generates a profile with zero noise around a shared center.
 * All invited cohort members use identical biases so that discrete
 * option selections match exactly—avoiding dealbreaker violations
 * and producing high cross-compatibility scores.
 */
function compatibleProfile(): GeneratedProfile {
  return {
    bias: 0.55,
    wantsKids: "Maybe",
    smoking: "Never",
    relocationBias: 0.55,
    touchBias: 0.55,
    religionBias: 0.55,
    noNoise: true,
  };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function biasedPick(question: QuestionnaireQuestion, bias: number): unknown {
  const opts = question.options as Record<string, unknown> | null;

  switch (question.type as QuestionnaireQuestionType) {
    case "RADIO_7": {
      const options = Array.isArray(opts) ? (opts as unknown as string[]) : [];
      if (options.length === 0) return null;
      const idx = Math.round(clamp(bias) * (options.length - 1));
      return options[idx];
    }

    case "NUMBER_SCALE": {
      const min = (opts as { min: number; max: number } | null)?.min ?? 0;
      const max = (opts as { min: number; max: number } | null)?.max ?? 10;
      return Math.round(min + clamp(bias) * (max - min));
    }

    case "DROPDOWN": {
      const options = (opts as string[] | null) ?? [];
      if (options.length === 0) return null;
      const idx = Math.floor(clamp(bias) * options.length);
      return options[Math.min(idx, options.length - 1)];
    }

    case "CHECKBOXES": {
      const options =
        (opts as { options?: string[] } | null)?.options ??
        (opts as string[] | null) ??
        [];
      if (options.length === 0) return [];
      const count = Math.min(options.length, Math.ceil(clamp(bias) * 3) || 1);
      const startIdx = Math.floor(clamp(bias) * (options.length - count));
      return options.slice(startIdx, startIdx + count);
    }

    case "RANKING": {
      const items = (opts as { items?: string[] } | null)?.items ?? [];
      if (items.length === 0) return [];
      const shuffled = [...items];
      if (bias > 0.6) shuffled.reverse();
      return shuffled;
    }

    case "POINT_ALLOCATION": {
      const items =
        (opts as { items?: string[]; total?: number } | null)?.items ?? [];
      const total =
        (opts as { items?: string[]; total?: number } | null)?.total ?? 100;
      if (items.length === 0) return {};
      const weights = items.map((_, i) => {
        const position = i / Math.max(items.length - 1, 1);
        return clamp(bias * position + (1 - bias) * (1 - position));
      });
      const weightSum = weights.reduce((a, b) => a + b, 0);
      const result: Record<string, number> = {};
      let remaining = total;
      items.forEach((item, i) => {
        if (i === items.length - 1) {
          result[item] = remaining;
        } else {
          const points = Math.round((weights[i]! / weightSum) * total);
          result[item] = points;
          remaining -= points;
        }
      });
      return result;
    }

    case "AGE_RANGE":
      return null;

    default:
      return null;
  }
}

function pickClosest(opts: string[], target: string): string {
  const exact = opts.find((o) => o === target);
  if (exact) return exact;
  const lowerTarget = target.toLowerCase();
  const partial = opts.find((o) => o.toLowerCase().includes(lowerTarget));
  if (partial) return partial;
  const reverse = opts.find((o) =>
    lowerTarget.includes(o.toLowerCase().split(" ")[0] ?? ""),
  );
  if (reverse) return reverse;
  return opts[0] ?? target;
}

function generateAnswer(
  question: QuestionnaireQuestion,
  profile: GeneratedProfile,
  personAge: number,
): unknown {
  if (question.mlWeight === 0) return null;
  if (
    question.type === "TEXT" ||
    question.type === "TEXTAREA" ||
    question.type === "RICH_TEXT"
  ) {
    return null;
  }

  const prompt = question.prompt.toLowerCase();

  if (question.type === "AGE_RANGE" || prompt.includes("age range")) {
    return { min: Math.max(18, personAge - 6), max: personAge + 8 };
  }

  if (
    prompt.includes("children") ||
    prompt.includes("kids") ||
    prompt.includes("child")
  ) {
    const opts = question.options as string[] | { options: string[] } | null;
    const optArr = Array.isArray(opts)
      ? opts
      : ((opts as { options?: string[] } | null)?.options ?? []);
    if (optArr.length > 0) return pickClosest(optArr, profile.wantsKids);
  }

  if (prompt.includes("how open are you to relocat")) {
    return biasedPick(question, profile.relocationBias);
  }

  if (
    prompt.includes("nicotine") ||
    prompt.includes("smok") ||
    prompt.includes("vape") ||
    prompt.includes("cigarette") ||
    prompt.includes("tobacco")
  ) {
    const opts = question.options as string[] | { options: string[] } | null;
    const optArr = Array.isArray(opts)
      ? opts
      : ((opts as { options?: string[] } | null)?.options ?? []);
    if (optArr.length > 0) return pickClosest(optArr, profile.smoking);
  }

  if (
    prompt.includes("touch") ||
    prompt.includes("affection") ||
    prompt.includes("physical intimacy") ||
    prompt.includes("cuddle") ||
    prompt.includes("hugs")
  ) {
    return biasedPick(question, profile.touchBias);
  }

  if (
    prompt.includes("religion") ||
    prompt.includes("spiritual") ||
    prompt.includes("faith") ||
    prompt.includes("church") ||
    prompt.includes("god") ||
    prompt.includes("prayer") ||
    prompt.includes("worship")
  ) {
    return biasedPick(question, profile.religionBias);
  }

  if (
    prompt.includes("spend") ||
    prompt.includes("financ") ||
    prompt.includes("money") ||
    prompt.includes("sav") ||
    prompt.includes("budget")
  ) {
    return biasedPick(question, profile.bias);
  }

  if (profile.noNoise) {
    return biasedPick(question, profile.bias);
  }
  const noise = (rng() - 0.5) * 0.3;
  return biasedPick(question, clamp(profile.bias + noise));
}

async function main() {
  const total = TARGET_MEN + TARGET_WOMEN;
  console.log(
    `Seeding ${total} mass-test applicants (${TARGET_MEN}M + ${TARGET_WOMEN}W)...\n`,
  );

  const existingTestUsers = await db.user.findMany({
    where: { email: { endsWith: "@masstest.reality.app" } },
    select: { email: true },
  });

  if (existingTestUsers.length > 0) {
    console.log(
      `Found ${existingTestUsers.length} existing mass-test users. Skipping those.\n`,
    );
  }

  const existingEmails = new Set(existingTestUsers.map((u) => u.email));

  const questions = await db.questionnaireQuestion.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { order: "asc" },
  });

  console.log(`Found ${questions.length} active questions\n`);

  const menIds: string[] = [];
  const womenIds: string[] = [];

  const usedEmails = new Set<string>();

  for (let i = 0; i < total; i++) {
    const isMale = i < TARGET_MEN;
    const gender = isMale ? "MAN" : "WOMAN";
    const seeking = isMale ? "WOMAN" : "MAN";
    const genderIdx = isMale ? i : i - TARGET_MEN;

    const firstNames = isMale ? MALE_FIRST : FEMALE_FIRST;
    const firstName = firstNames[genderIdx % firstNames.length]!;
    const lastName =
      LAST_NAMES[
        Math.floor(genderIdx / firstNames.length) % LAST_NAMES.length
      ]!;

    let suffix = Math.floor(
      genderIdx / (firstNames.length * LAST_NAMES.length),
    );
    let email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${suffix > 0 ? suffix : ""}@masstest.reality.app`;

    // Only deduplicate within this session. The existingEmails check below
    // handles re-use of users from a previous run. Including existingEmails
    // here would make that check unreachable (email guaranteed not in the set).
    while (usedEmails.has(email)) {
      suffix++;
      email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${suffix}@masstest.reality.app`;
    }
    usedEmails.add(email);

    const clerkId = `masstest_${email.split("@")[0]!.replace(/\./g, "_")}`;

    if (existingEmails.has(email)) {
      const user = await db.user.findUnique({
        where: { email },
        include: { applicant: true },
      });
      if (user?.applicant) {
        if (isMale) menIds.push(user.applicant.id);
        else womenIds.push(user.applicant.id);
      }
      continue;
    }

    // Use compatible profiles for the first INVITE_PER_GENDER of each gender
    // so the invited cohort has high cross-compatibility
    const isInvitedCohort = genderIdx < INVITE_PER_GENDER;
    const profile = isInvitedCohort ? compatibleProfile() : randomProfile();
    const age = isInvitedCohort
      ? 27 + Math.floor(rng() * 8)
      : 22 + Math.floor(rng() * 23);

    const user = await db.user.create({
      data: {
        clerkId,
        email,
        firstName,
        lastName,
        role: "APPLICANT",
      },
    });

    const applicant = await db.applicant.create({
      data: {
        userId: user.id,
        age,
        gender,
        seeking,
        location: `${pick(LOCATIONS)}, AZ`,
        occupation: "Test Occupation",
        education: pick(EDUCATION),
        incomeRange: pick(INCOME),
        applicationStatus: "APPROVED",
        screeningStatus: "PASSED",
        idenfyStatus: "PASSED",
        checkrStatus: "PASSED",
      },
    });

    if (isMale) menIds.push(applicant.id);
    else womenIds.push(applicant.id);

    const answersToCreate: Array<{
      applicantId: string;
      questionId: string;
      value: unknown;
    }> = [];

    for (const question of questions) {
      const value = generateAnswer(question, profile, age);
      if (value === null) continue;
      answersToCreate.push({
        applicantId: applicant.id,
        questionId: question.id,
        value,
      });
    }

    if (answersToCreate.length > 0) {
      await db.questionnaireAnswer.createMany({
        data: answersToCreate.map((a) => ({
          applicantId: a.applicantId,
          questionId: a.questionId,
          value: a.value as import("@prisma/client").Prisma.InputJsonValue,
        })),
        skipDuplicates: true,
      });
    }

    if ((i + 1) % 100 === 0 || i === total - 1) {
      console.log(
        `  Progress: ${i + 1}/${total} (${menIds.length}M + ${womenIds.length}W)`,
      );
    }
  }

  console.log(`\nCreated: ${menIds.length} men, ${womenIds.length} women\n`);

  // Invite first INVITE_PER_GENDER of each to the February event
  const inviteMen = menIds.slice(0, INVITE_PER_GENDER);
  const inviteWomen = womenIds.slice(0, INVITE_PER_GENDER);
  const inviteeIds = [...inviteMen, ...inviteWomen];

  if (inviteeIds.length > 0) {
    const result = await db.eventInvitation.createMany({
      data: inviteeIds.map((applicantId) => ({
        eventId: FEBRUARY_EVENT_ID,
        applicantId,
        status: "ACCEPTED" as const,
      })),
      skipDuplicates: true,
    });

    console.log(
      `Invited ${result.count} applicants to February event (${inviteMen.length}M + ${inviteWomen.length}W)`,
    );
  }

  const totalTestApplicants = await db.applicant.count({
    where: {
      user: { email: { endsWith: "@masstest.reality.app" } },
    },
  });

  const totalAnswers = await db.questionnaireAnswer.count({
    where: {
      applicant: {
        user: { email: { endsWith: "@masstest.reality.app" } },
      },
    },
  });

  const totalInvitations = await db.eventInvitation.count({
    where: {
      eventId: FEBRUARY_EVENT_ID,
      applicant: {
        user: { email: { endsWith: "@masstest.reality.app" } },
      },
    },
  });

  console.log("\nSeed complete!\n");
  console.log("Verification:");
  console.log(`   Mass-test applicants in DB: ${totalTestApplicants}`);
  console.log(`   Answers created:            ${totalAnswers}`);
  console.log(`   Event invitations:          ${totalInvitations}`);

  await db.$disconnect();
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
