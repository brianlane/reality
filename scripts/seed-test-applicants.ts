/**
 * Seed Test Applicants Script
 *
 * Creates 48 synthetic test personas (6 profiles × 4 men + 4 women)
 * with questionnaire answers and invitations to the February event.
 *
 * Usage: npx tsx scripts/seed-test-applicants.ts
 *
 * DATA SAFETY:
 * - Only creates new records — never modifies existing data
 * - Test users use @test.reality.app emails and test_* clerkIds
 * - Idempotent: skips any test users that already exist
 * - EventInvitations use skipDuplicates: true
 */

import "dotenv/config";
import { db } from "../src/lib/db";
import type {
  QuestionnaireQuestionType,
  QuestionnaireQuestion,
} from "@prisma/client";

// ============================================
// FEBRUARY EVENT ID
// ============================================

const FEBRUARY_EVENT_ID = "cmlqropt800376v54xz2k7ovu";

// ============================================
// PERSONALITY PROFILES
// ============================================

interface Profile {
  name: string;
  wantsKids: string;
  smoking: string;
  relocation: string;
  spending: string;
  touchRating: number; // 1-7
  religionRating: number; // 1-7
  defaultBias: number; // 0-1
  education: string;
  incomeRange: string;
}

const PROFILES: Record<string, Profile> = {
  traditional: {
    name: "Traditional Family",
    wantsKids: "Yes",
    smoking: "Never",
    relocation: "Somewhat open",
    spending: "Balanced",
    touchRating: 6,
    religionRating: 6,
    defaultBias: 0.7,
    education: "Bachelor's Degree",
    incomeRange: "$75,000–$99,999",
  },
  career: {
    name: "Career Professional",
    wantsKids: "Maybe",
    smoking: "Never",
    relocation: "Very open",
    spending: "Spender",
    touchRating: 4,
    religionRating: 3,
    defaultBias: 0.4,
    education: "Master's Degree",
    incomeRange: "$100,000–$149,999",
  },
  adventurer: {
    name: "Social Adventurer",
    wantsKids: "Maybe",
    smoking: "Socially",
    relocation: "Very open",
    spending: "Spender",
    touchRating: 5,
    religionRating: 4,
    defaultBias: 0.5,
    education: "Bachelor's Degree",
    incomeRange: "$75,000–$99,999",
  },
  homebody: {
    name: "Homebody Nester",
    wantsKids: "Yes",
    smoking: "Never",
    relocation: "Not open",
    spending: "Saver",
    touchRating: 7,
    religionRating: 5,
    defaultBias: 0.75,
    education: "Bachelor's Degree",
    incomeRange: "$75,000–$99,999",
  },
  spiritual: {
    name: "Spiritual Mindful",
    wantsKids: "Maybe",
    smoking: "Never",
    relocation: "Somewhat open",
    spending: "Balanced",
    touchRating: 5,
    religionRating: 7,
    defaultBias: 0.5,
    education: "Bachelor's Degree",
    incomeRange: "$75,000–$99,999",
  },
  intellectual: {
    name: "Independent Intellectual",
    wantsKids: "No",
    smoking: "Rarely",
    relocation: "Very open",
    spending: "Saver",
    touchRating: 3,
    religionRating: 2,
    defaultBias: 0.3,
    education: "Master's Degree",
    incomeRange: "$100,000–$149,999",
  },
};

// ============================================
// PERSONA ROSTER
// ============================================

interface PersonaSpec {
  firstName: string;
  lastName: string;
  age: number;
  location: string;
  gender: "MAN" | "WOMAN";
  seeking: "WOMAN" | "MAN";
  profileKey: string;
}

const PERSONAS: PersonaSpec[] = [
  // ── Men ────────────────────────────────────────────────────────────────
  // Traditional Family
  {
    firstName: "James",
    lastName: "Caldwell",
    age: 32,
    location: "Phoenix",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "traditional",
  },
  {
    firstName: "Robert",
    lastName: "Harmon",
    age: 36,
    location: "Scottsdale",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "traditional",
  },
  {
    firstName: "Tyler",
    lastName: "Merritt",
    age: 29,
    location: "Gilbert",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "traditional",
  },
  {
    firstName: "Brian",
    lastName: "Stafford",
    age: 41,
    location: "Mesa",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "traditional",
  },
  // Career Professional
  {
    firstName: "Nathan",
    lastName: "Wells",
    age: 34,
    location: "Scottsdale",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "career",
  },
  {
    firstName: "Kevin",
    lastName: "Marsh",
    age: 28,
    location: "Tempe",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "career",
  },
  {
    firstName: "Derek",
    lastName: "Hollis",
    age: 38,
    location: "Phoenix",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "career",
  },
  {
    firstName: "Austin",
    lastName: "Fleming",
    age: 31,
    location: "Chandler",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "career",
  },
  // Social Adventurer
  {
    firstName: "Marcus",
    lastName: "Cole",
    age: 30,
    location: "Tempe",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "adventurer",
  },
  {
    firstName: "Jordan",
    lastName: "Reyes",
    age: 33,
    location: "Phoenix",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "adventurer",
  },
  {
    firstName: "Ethan",
    lastName: "Shea",
    age: 27,
    location: "Scottsdale",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "adventurer",
  },
  {
    firstName: "Caleb",
    lastName: "Ross",
    age: 35,
    location: "Peoria",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "adventurer",
  },
  // Homebody Nester
  {
    firstName: "Scott",
    lastName: "Raines",
    age: 37,
    location: "Chandler",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "homebody",
  },
  {
    firstName: "Greg",
    lastName: "Payne",
    age: 40,
    location: "Gilbert",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "homebody",
  },
  {
    firstName: "Ryan",
    lastName: "Brooks",
    age: 29,
    location: "Mesa",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "homebody",
  },
  {
    firstName: "Paul",
    lastName: "Garrett",
    age: 44,
    location: "Glendale",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "homebody",
  },
  // Spiritual Mindful
  {
    firstName: "Alex",
    lastName: "Rivera",
    age: 32,
    location: "Phoenix",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "spiritual",
  },
  {
    firstName: "Daniel",
    lastName: "Chen",
    age: 36,
    location: "Scottsdale",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "spiritual",
  },
  {
    firstName: "Ian",
    lastName: "Walsh",
    age: 28,
    location: "Tempe",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "spiritual",
  },
  {
    firstName: "Chris",
    lastName: "Navarro",
    age: 39,
    location: "Chandler",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "spiritual",
  },
  // Independent Intellectual
  {
    firstName: "Ben",
    lastName: "Thornton",
    age: 31,
    location: "Phoenix",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "intellectual",
  },
  {
    firstName: "Sam",
    lastName: "Kowalski",
    age: 35,
    location: "Tempe",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "intellectual",
  },
  {
    firstName: "Luke",
    lastName: "Donovan",
    age: 42,
    location: "Scottsdale",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "intellectual",
  },
  {
    firstName: "Noah",
    lastName: "Kramer",
    age: 27,
    location: "Mesa",
    gender: "MAN",
    seeking: "WOMAN",
    profileKey: "intellectual",
  },
  // ── Women ──────────────────────────────────────────────────────────────
  // Traditional Family
  {
    firstName: "Rachel",
    lastName: "Holt",
    age: 29,
    location: "Phoenix",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "traditional",
  },
  {
    firstName: "Maria",
    lastName: "Estrada",
    age: 34,
    location: "Gilbert",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "traditional",
  },
  {
    firstName: "Claire",
    lastName: "Sutton",
    age: 31,
    location: "Mesa",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "traditional",
  },
  {
    firstName: "Diane",
    lastName: "Foster",
    age: 38,
    location: "Scottsdale",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "traditional",
  },
  // Career Professional
  {
    firstName: "Megan",
    lastName: "Blake",
    age: 28,
    location: "Scottsdale",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "career",
  },
  {
    firstName: "Taylor",
    lastName: "Jennings",
    age: 33,
    location: "Tempe",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "career",
  },
  {
    firstName: "Lauren",
    lastName: "Cross",
    age: 36,
    location: "Phoenix",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "career",
  },
  {
    firstName: "Priya",
    lastName: "Shah",
    age: 30,
    location: "Chandler",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "career",
  },
  // Social Adventurer
  {
    firstName: "Vanessa",
    lastName: "Park",
    age: 27,
    location: "Tempe",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "adventurer",
  },
  {
    firstName: "Kayla",
    lastName: "Rhodes",
    age: 31,
    location: "Phoenix",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "adventurer",
  },
  {
    firstName: "Nicole",
    lastName: "Rivera",
    age: 29,
    location: "Scottsdale",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "adventurer",
  },
  {
    firstName: "Jenna",
    lastName: "Owens",
    age: 35,
    location: "Peoria",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "adventurer",
  },
  // Homebody Nester
  {
    firstName: "Amanda",
    lastName: "Hicks",
    age: 30,
    location: "Chandler",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "homebody",
  },
  {
    firstName: "Beth",
    lastName: "Lawson",
    age: 38,
    location: "Gilbert",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "homebody",
  },
  {
    firstName: "Sandra",
    lastName: "Ruiz",
    age: 26,
    location: "Mesa",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "homebody",
  },
  {
    firstName: "Diane",
    lastName: "Coleman",
    age: 42,
    location: "Glendale",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "homebody",
  },
  // Spiritual Mindful
  {
    firstName: "Sophia",
    lastName: "Wells",
    age: 29,
    location: "Phoenix",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "spiritual",
  },
  {
    firstName: "Lily",
    lastName: "Torres",
    age: 33,
    location: "Scottsdale",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "spiritual",
  },
  {
    firstName: "Grace",
    lastName: "Kim",
    age: 31,
    location: "Tempe",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "spiritual",
  },
  {
    firstName: "Maya",
    lastName: "Patel",
    age: 36,
    location: "Chandler",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "spiritual",
  },
  // Independent Intellectual
  {
    firstName: "Zoe",
    lastName: "Fitch",
    age: 28,
    location: "Phoenix",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "intellectual",
  },
  {
    firstName: "Caitlin",
    lastName: "Moore",
    age: 32,
    location: "Tempe",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "intellectual",
  },
  {
    firstName: "Abby",
    lastName: "Larson",
    age: 39,
    location: "Scottsdale",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "intellectual",
  },
  {
    firstName: "Hazel",
    lastName: "Dunn",
    age: 26,
    location: "Mesa",
    gender: "WOMAN",
    seeking: "MAN",
    profileKey: "intellectual",
  },
];

// ============================================
// ANSWER GENERATION HELPERS
// ============================================

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Find the option that best matches the target string.
 * Tries exact match, then case-insensitive substring, then first option.
 */
function pickClosest(opts: string[], target: string): string {
  const exact = opts.find((o) => o === target);
  if (exact) return exact;
  const lowerTarget = target.toLowerCase();
  const partial = opts.find((o) => o.toLowerCase().includes(lowerTarget));
  if (partial) return partial;
  // Try if target contains any option substring
  const reverse = opts.find((o) =>
    lowerTarget.includes(o.toLowerCase().split(" ")[0] ?? ""),
  );
  if (reverse) return reverse;
  return opts[0] ?? target;
}

/**
 * Pick a value based on a 0–1 bias for different question types.
 */
function biasedPick(
  question: QuestionnaireQuestion,
  bias: number,
): unknown {
  const opts = question.options as Record<string, unknown> | null;

  switch (question.type as QuestionnaireQuestionType) {
    case "RADIO_7": {
      // bias 0-1 → integer 1-7
      return Math.round(clamp(bias) * 6) + 1;
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
      // Pick 1-3 options, bias-weighted toward the end of the array
      const count = Math.min(options.length, Math.ceil(clamp(bias) * 3) || 1);
      const startIdx = Math.floor(clamp(bias) * (options.length - count));
      return options.slice(startIdx, startIdx + count);
    }

    case "RANKING": {
      const items = (opts as { items?: string[] } | null)?.items ?? [];
      if (items.length === 0) return [];
      // Low bias = natural order, high bias = reversed order, blend for middle
      const shuffled = [...items];
      if (bias > 0.6) shuffled.reverse();
      return shuffled;
    }

    case "POINT_ALLOCATION": {
      const items = (opts as { items?: string[]; total?: number } | null)?.items ?? [];
      const total = (opts as { items?: string[]; total?: number } | null)?.total ?? 100;
      if (items.length === 0) return {};
      // Distribute points, more to bias-aligned (later) items
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

    case "AGE_RANGE": {
      // Handled separately
      return null;
    }

    default:
      return null;
  }
}

/**
 * Generate an answer value for a question based on the persona's profile.
 */
function generateAnswer(
  question: QuestionnaireQuestion,
  profile: Profile,
  personAge: number,
): unknown {
  // Skip TEXT/TEXTAREA questions (mlWeight === 0 means no scoring value)
  if (question.mlWeight === 0) return null;

  // Also skip TEXT/TEXTAREA/RICH_TEXT types outright
  if (
    question.type === "TEXT" ||
    question.type === "TEXTAREA" ||
    question.type === "RICH_TEXT"
  ) {
    return null;
  }

  const prompt = question.prompt.toLowerCase();

  // Age range question
  if (question.type === "AGE_RANGE" || prompt.includes("age range")) {
    return { min: Math.max(18, personAge - 6), max: personAge + 8 };
  }

  // Kids / children
  if (prompt.includes("children") || prompt.includes("kids") || prompt.includes("child")) {
    const opts = question.options as string[] | { options: string[] } | null;
    const optArr = Array.isArray(opts) ? opts : (opts as { options?: string[] } | null)?.options ?? [];
    if (optArr.length > 0) return pickClosest(optArr, profile.wantsKids);
  }

  // Relocation
  if (prompt.includes("reloc") || prompt.includes("move") && prompt.includes("city")) {
    const opts = question.options as string[] | { options: string[] } | null;
    const optArr = Array.isArray(opts) ? opts : (opts as { options?: string[] } | null)?.options ?? [];
    if (optArr.length > 0) return pickClosest(optArr, profile.relocation);
  }

  // Smoking / nicotine / vaping
  if (
    prompt.includes("nicotine") ||
    prompt.includes("smok") ||
    prompt.includes("vape") ||
    prompt.includes("cigarette") ||
    prompt.includes("tobacco")
  ) {
    const opts = question.options as string[] | { options: string[] } | null;
    const optArr = Array.isArray(opts) ? opts : (opts as { options?: string[] } | null)?.options ?? [];
    if (optArr.length > 0) return pickClosest(optArr, profile.smoking);
  }

  // Touch / affection / physical intimacy
  if (
    prompt.includes("touch") ||
    prompt.includes("affection") ||
    prompt.includes("physical intimacy") ||
    prompt.includes("cuddle") ||
    prompt.includes("hugs")
  ) {
    return biasedPick(question, profile.touchRating / 7);
  }

  // Religion / spirituality / faith
  if (
    prompt.includes("religion") ||
    prompt.includes("spiritual") ||
    prompt.includes("faith") ||
    prompt.includes("church") ||
    prompt.includes("god") ||
    prompt.includes("prayer") ||
    prompt.includes("worship")
  ) {
    return biasedPick(question, profile.religionRating / 7);
  }

  // Finances / spending / saving / money
  if (
    prompt.includes("spend") ||
    prompt.includes("financ") ||
    prompt.includes("money") ||
    prompt.includes("sav") ||
    prompt.includes("budget")
  ) {
    const opts = question.options as string[] | { options: string[] } | null;
    const optArr = Array.isArray(opts) ? opts : (opts as { options?: string[] } | null)?.options ?? [];
    if (optArr.length > 0) return pickClosest(optArr, profile.spending);
  }

  // Default: use profile's default bias with ±15% random noise
  const noise = (Math.random() - 0.5) * 0.3;
  return biasedPick(question, clamp(profile.defaultBias + noise));
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log("🌱 Seeding 48 test applicants...\n");

  // ── 1. Idempotency guard ──────────────────────────────────────────────
  const existingTestUsers = await db.user.findMany({
    where: { email: { endsWith: "@test.reality.app" } },
    select: { email: true },
  });

  if (existingTestUsers.length > 0) {
    console.log(
      `⚠️  Found ${existingTestUsers.length} existing test users. Skipping those personas and only creating new ones.`,
    );
  }

  const existingEmails = new Set(existingTestUsers.map((u) => u.email));

  // ── 2. Fetch all active questions (read-only) ─────────────────────────
  const questions = await db.questionnaireQuestion.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { order: "asc" },
  });

  console.log(`📋 Found ${questions.length} active questions\n`);

  // ── 3. Create personas ────────────────────────────────────────────────
  const menIds: string[] = [];
  const womenIds: string[] = [];

  for (const persona of PERSONAS) {
    const email = `${persona.firstName.toLowerCase()}.${persona.lastName.toLowerCase()}@test.reality.app`;
    const clerkId = `test_${persona.firstName.toLowerCase()}_${persona.lastName.toLowerCase()}`;

    // Skip if already exists
    if (existingEmails.has(email)) {
      console.log(`  ⏭  Skipping ${persona.firstName} ${persona.lastName} (already exists)`);

      // Still need to collect their applicant ID for invitations
      const user = await db.user.findUnique({
        where: { email },
        include: { applicant: true },
      });
      if (user?.applicant) {
        if (persona.gender === "MAN") menIds.push(user.applicant.id);
        else womenIds.push(user.applicant.id);
      }
      continue;
    }

    const profile = PROFILES[persona.profileKey]!;

    // Create user
    const user = await db.user.create({
      data: {
        clerkId,
        email,
        firstName: persona.firstName,
        lastName: persona.lastName,
        role: "APPLICANT",
      },
    });

    // Create applicant
    const applicant = await db.applicant.create({
      data: {
        userId: user.id,
        age: persona.age,
        gender: persona.gender,
        seeking: persona.seeking,
        location: `${persona.location}, AZ`,
        occupation: profile.name,
        education: profile.education,
        incomeRange: profile.incomeRange,
        applicationStatus: "APPROVED",
        screeningStatus: "PASSED",
        idenfyStatus: "PASSED",
        checkrStatus: "PASSED",
      },
    });

    if (persona.gender === "MAN") menIds.push(applicant.id);
    else womenIds.push(applicant.id);

    // Generate answers for each scoreable question
    const answersToCreate: Array<{
      applicantId: string;
      questionId: string;
      value: unknown;
    }> = [];

    for (const question of questions) {
      const value = generateAnswer(question, profile, persona.age);
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

    console.log(
      `  ✓ ${persona.firstName} ${persona.lastName} (${profile.name}) — ${answersToCreate.length} answers`,
    );
  }

  console.log(
    `\n📊 Created: ${menIds.length} men, ${womenIds.length} women\n`,
  );

  // ── 4. Invite first 10 men + first 10 women to February event ─────────
  const first10Men = menIds.slice(0, 10);
  const first10Women = womenIds.slice(0, 10);
  const inviteeIds = [...first10Men, ...first10Women];

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
      `🎟  Invited ${result.count} applicants to February event (${first10Men.length} men + ${first10Women.length} women)`,
    );
  }

  // ── 5. Verify ─────────────────────────────────────────────────────────
  const totalTestApplicants = await db.applicant.count({
    where: {
      user: { email: { endsWith: "@test.reality.app" } },
    },
  });

  const totalAnswers = await db.questionnaireAnswer.count({
    where: {
      applicant: {
        user: { email: { endsWith: "@test.reality.app" } },
      },
    },
  });

  const totalInvitations = await db.eventInvitation.count({
    where: {
      eventId: FEBRUARY_EVENT_ID,
      applicant: {
        user: { email: { endsWith: "@test.reality.app" } },
      },
    },
  });

  console.log("\n✅ Seed complete!\n");
  console.log("🔍 Verification:");
  console.log(`   Test applicants in DB: ${totalTestApplicants}`);
  console.log(`   Answers created:       ${totalAnswers}`);
  console.log(`   Event invitations:     ${totalInvitations}`);

  await db.$disconnect();
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
