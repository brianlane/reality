// prisma/seed.ts
// Seed script for Reality Matchmaking development environment

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import type { JsonValue } from "../src/lib/json";

// Remove sslmode from DATABASE_URL to prevent conflicts with pool ssl config (same as src/lib/db.ts)
const getDatabaseUrl = (): string => {
  const url = process.env.DATABASE_URL || "";
  return url
    .replace(/[?&]sslmode=[^&]*/g, (match, offset) => {
      if (match.startsWith("?")) {
        const remaining = url.slice(offset + match.length);
        return remaining.startsWith("&") ? "?" : "";
      }
      return "";
    })
    .replace(/\?&/, "?");
};

// Configure PostgreSQL connection pool for seeding
// Always allow self-signed certificates since seeding only runs in development
const pool = new Pool({
  connectionString: getDatabaseUrl(),
  ssl:
    process.env.DATABASE_SSL === "false"
      ? false
      : { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  const environment = process.env["NODE_ENV"] ?? "development";
  if (environment === "production") {
    console.log("⚠️  Skipping seed in production.");
    return;
  }

  // Clear existing data (in order due to foreign key constraints)
  await prisma.match.deleteMany();
  await prisma.eventInvitation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.event.deleteMany();
  await prisma.questionnaireAnswer.deleteMany();
  await prisma.questionnaireQuestion.deleteMany();
  await prisma.questionnaireSection.deleteMany();
  await prisma.questionnairePage.deleteMany();
  await prisma.applicant.deleteMany();
  await prisma.adminAction.deleteMany();
  await prisma.user.deleteMany();

  console.log("✓ Cleared existing data");

  // ============================================
  // USERS
  // ============================================

  // Admin user
  const adminUser = await prisma.user.create({
    data: {
      clerkId: "user_admin_12345",
      email: "admin@realitymatchmaking.com",
      firstName: "Brian",
      lastName: "Lane",
      phone: "+14805551234",
      role: "ADMIN",
    },
  });

  console.log("✓ Created admin user");

  const mockApplicantUser = await prisma.user.create({
    data: {
      clerkId: "mock-user",
      email: "mock-user@realitymatchmaking.com",
      firstName: "Mock",
      lastName: "Applicant",
      phone: "+14805559999",
      role: "APPLICANT",
    },
  });

  await prisma.applicant.create({
    data: {
      userId: mockApplicantUser.id,
      age: 28,
      gender: "WOMAN",
      location: "Phoenix, AZ",
      occupation: "Marketing Manager",
      employer: "Reality Matchmaking",
      education: "Bachelor's Degree",
      incomeRange: "$100,000-$150,000",
      incomeVerified: true,
      applicationStatus: "SUBMITTED",
      submittedAt: new Date(2026, 0, 12),
      screeningStatus: "IN_PROGRESS",
      idenfyStatus: "PENDING",
      checkrStatus: "PENDING",
      photos: ["https://i.pravatar.cc/300?img=64"],
    },
  });

  console.log("✓ Created mock applicant");

  // Create 30 applicant users (15 male, 15 female)
  const maleFirstNames = [
    "James",
    "John",
    "Robert",
    "Michael",
    "David",
    "William",
    "Richard",
    "Joseph",
    "Thomas",
    "Christopher",
    "Daniel",
    "Matthew",
    "Anthony",
    "Mark",
    "Donald",
  ];
  const femaleFirstNames = [
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
    "Nancy",
    "Lisa",
    "Betty",
    "Margaret",
    "Sandra",
  ];
  const lastNames = [
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
    "Hernandez",
    "Lopez",
    "Gonzalez",
    "Wilson",
    "Anderson",
  ];

  const occupations = [
    "Software Engineer",
    "Product Manager",
    "Marketing Manager",
    "Financial Analyst",
    "Sales Director",
    "UX Designer",
    "Data Scientist",
    "Account Executive",
    "Business Analyst",
    "Operations Manager",
    "Consultant",
    "Attorney",
    "Medical Doctor",
    "Architect",
    "Entrepreneur",
  ];

  const users: Array<{ id: string }> = [];
  const applicants: Array<{
    id: string;
    gender: string;
    occupation: string;
    compatibilityScore: number | null;
  }> = [];

  // Create male applicants
  for (let i = 0; i < 15; i++) {
    const user = await prisma.user.create({
      data: {
        clerkId: `user_male_${i}`,
        email: `${maleFirstNames[i].toLowerCase()}.${lastNames[i].toLowerCase()}@example.com`,
        firstName: maleFirstNames[i],
        lastName: lastNames[i],
        phone: `+1480555${1000 + i}`,
        role: "APPLICANT",
      },
    });

    const applicant = await prisma.applicant.create({
      data: {
        userId: user.id,
        age: 25 + Math.floor(Math.random() * 11), // 25-35
        gender: "MAN",
        location: "Phoenix, AZ",
        occupation: occupations[i],
        employer:
          i % 3 === 0
            ? "Startup XYZ"
            : i % 3 === 1
              ? "Tech Corp"
              : "Consulting Firm",
        education: i % 2 === 0 ? "Bachelor's Degree" : "Master's Degree",
        incomeRange:
          i % 3 === 0
            ? "$100,000-$150,000"
            : i % 3 === 1
              ? "$150,000-$200,000"
              : "$200,000+",
        incomeVerified: true,
        applicationStatus:
          i < 10 ? "APPROVED" : i < 12 ? "SCREENING_IN_PROGRESS" : "SUBMITTED",
        submittedAt: new Date(2026, 0, 10 + i),
        reviewedAt: i < 10 ? new Date(2026, 0, 12 + i) : null,
        screeningStatus: i < 10 ? "PASSED" : i < 12 ? "IN_PROGRESS" : "PENDING",
        idenfyStatus: i < 10 ? "PASSED" : "PENDING",
        idenfyVerificationId: i < 10 ? `idenfy_male_${i}` : null,
        checkrStatus: i < 10 ? "PASSED" : "PENDING",
        checkrReportId: i < 10 ? `checkr_male_${i}` : null,
        compatibilityScore: i < 10 ? 70 + Math.random() * 30 : null,
        photos: [
          `https://i.pravatar.cc/300?img=${i + 1}`,
          `https://i.pravatar.cc/300?img=${i + 20}`,
        ],
      },
    });

    users.push(user);
    applicants.push(applicant);
  }

  console.log("✓ Created 15 male applicants");

  // Create female applicants
  for (let i = 0; i < 15; i++) {
    const user = await prisma.user.create({
      data: {
        clerkId: `user_female_${i}`,
        email: `${femaleFirstNames[i].toLowerCase()}.${lastNames[i].toLowerCase()}@example.com`,
        firstName: femaleFirstNames[i],
        lastName: lastNames[i],
        phone: `+1480555${2000 + i}`,
        role: "APPLICANT",
      },
    });

    const applicant = await prisma.applicant.create({
      data: {
        userId: user.id,
        age: 24 + Math.floor(Math.random() * 11), // 24-34
        gender: "WOMAN",
        location: "Phoenix, AZ",
        occupation: occupations[i],
        employer:
          i % 3 === 0
            ? "Marketing Agency"
            : i % 3 === 1
              ? "Finance Corp"
              : "Healthcare Group",
        education: i % 2 === 0 ? "Bachelor's Degree" : "Master's Degree",
        incomeRange:
          i % 3 === 0
            ? "$100,000-$150,000"
            : i % 3 === 1
              ? "$150,000-$200,000"
              : "$200,000+",
        incomeVerified: true,
        applicationStatus:
          i < 10 ? "APPROVED" : i < 12 ? "SCREENING_IN_PROGRESS" : "WAITLIST",
        submittedAt: new Date(2026, 0, 10 + i),
        reviewedAt: i < 10 ? new Date(2026, 0, 12 + i) : null,
        screeningStatus: i < 10 ? "PASSED" : i < 12 ? "IN_PROGRESS" : "PENDING",
        idenfyStatus: i < 10 ? "PASSED" : "PENDING",
        idenfyVerificationId: i < 10 ? `idenfy_female_${i}` : null,
        checkrStatus: i < 10 ? "PASSED" : "PENDING",
        checkrReportId: i < 10 ? `checkr_female_${i}` : null,
        compatibilityScore: i < 10 ? 70 + Math.random() * 30 : null,
        photos: [
          `https://i.pravatar.cc/300?img=${i + 40}`,
          `https://i.pravatar.cc/300?img=${i + 50}`,
        ],
      },
    });

    users.push(user);
    applicants.push(applicant);
  }

  console.log("✓ Created 15 female applicants");

  // ============================================
  // PAYMENTS
  // ============================================

  // Application fee payments for approved applicants
  for (let i = 0; i < 20; i++) {
    await prisma.payment.create({
      data: {
        applicantId: applicants[i].id,
        type: "APPLICATION_FEE",
        amount: 19900, // $199
        status: "SUCCEEDED",
        stripePaymentId: `pi_app_${i}`,
        stripeInvoiceId: `in_app_${i}`,
        createdAt: new Date(2026, 0, 10 + i),
      },
    });
  }

  console.log("✓ Created 20 application fee payments");

  // ============================================
  // EVENTS
  // ============================================

  // Past event (December 2025)
  const pastEvent = await prisma.event.create({
    data: {
      name: "Phoenix Dating Experience - December",
      date: new Date(2025, 11, 15),
      startTime: new Date(2025, 11, 15, 19, 0),
      endTime: new Date(2025, 11, 15, 22, 30),
      venue: "The Phoenician Resort",
      venueAddress: "6000 E Camelback Rd, Scottsdale, AZ 85251",
      capacity: 20,
      status: "COMPLETED",
      venueCost: 150000, // $1,500
      cateringCost: 80000, // $800
      materialsCost: 20000, // $200
      totalCost: 250000, // $2,500
      expectedRevenue: 1498000, // 20 * $749
      actualRevenue: 1348200, // 18 people showed up
      notes:
        "Great turnout! 3 couples exchanged contact info during social hour.",
      createdAt: new Date(2025, 10, 1),
      createdBy: adminUser.id,
    },
  });

  // Upcoming event (February 2026)
  const upcomingEvent = await prisma.event.create({
    data: {
      name: "Phoenix Dating Experience - February",
      date: new Date(2026, 1, 14), // Valentine's week
      startTime: new Date(2026, 1, 14, 19, 0),
      endTime: new Date(2026, 1, 14, 22, 30),
      venue: "Hotel Valley Ho",
      venueAddress: "6850 E Main St, Scottsdale, AZ 85251",
      capacity: 20,
      status: "CONFIRMED",
      venueCost: 150000,
      cateringCost: 80000,
      materialsCost: 20000,
      totalCost: 250000,
      expectedRevenue: 1498000,
      actualRevenue: 0,
      notes: "Valentine's themed event - expect high demand!",
      createdAt: new Date(2026, 0, 5),
      createdBy: adminUser.id,
    },
  });

  console.log("✓ Created 2 events");

  // ============================================
  // EVENT INVITATIONS & PAYMENTS (Past Event)
  // ============================================

  // Select first 10 male and 10 female approved applicants for past event
  const pastEventMales = applicants
    .filter((a) => a.gender === "MAN")
    .slice(0, 10);
  const pastEventFemales = applicants
    .filter((a) => a.gender === "WOMAN")
    .slice(0, 10);
  const pastEventParticipants = [...pastEventMales, ...pastEventFemales];

  for (const participant of pastEventParticipants) {
    await prisma.eventInvitation.create({
      data: {
        eventId: pastEvent.id,
        applicantId: participant.id,
        status: Math.random() > 0.1 ? "ATTENDED" : "NO_SHOW", // 90% attendance
        invitedAt: new Date(2025, 10, 15),
        respondedAt: new Date(2025, 10, 16),
        interestedIn: [], // Will fill in with matches
      },
    });

    // Event fee payment
    await prisma.payment.create({
      data: {
        applicantId: participant.id,
        type: "EVENT_FEE",
        amount: 74900, // $749
        status: "SUCCEEDED",
        eventId: pastEvent.id,
        stripePaymentId: `pi_event_past_${participant.id}`,
        stripeInvoiceId: `in_event_past_${participant.id}`,
        createdAt: new Date(2025, 10, 16),
      },
    });
  }

  console.log("✓ Created 20 event invitations and payments for past event");

  // ============================================
  // EVENT INVITATIONS (Upcoming Event)
  // ============================================

  for (const participant of pastEventParticipants) {
    const accepted = Math.random() > 0.2;
    const respondedAt = accepted ? new Date(2026, 0, 21) : null;

    await prisma.eventInvitation.create({
      data: {
        eventId: upcomingEvent.id,
        applicantId: participant.id,
        status: accepted ? "ACCEPTED" : "PENDING",
        invitedAt: new Date(2026, 0, 20),
        respondedAt,
        interestedIn: [],
      },
    });

    // Event fee payment for accepted invitations
    if (accepted) {
      await prisma.payment.create({
        data: {
          applicantId: participant.id,
          type: "EVENT_FEE",
          amount: 74900,
          status: "SUCCEEDED",
          eventId: upcomingEvent.id,
          stripePaymentId: `pi_event_upcoming_${participant.id}`,
          stripeInvoiceId: `in_event_upcoming_${participant.id}`,
          createdAt: new Date(2026, 0, 21),
        },
      });
    }
  }

  console.log("✓ Created 20 event invitations for upcoming event");

  // ============================================
  // MATCHES (Past Event)
  // ============================================

  // Create curated matches for past event
  const matchOutcomes = [
    "FIRST_DATE_SCHEDULED",
    "FIRST_DATE_COMPLETED",
    "SECOND_DATE",
    "DATING",
    "RELATIONSHIP",
    "NO_CONNECTION",
    "PENDING",
  ] as const;
  type MatchOutcome = (typeof matchOutcomes)[number];

  let matchCount = 0;

  // Track created matches to avoid duplicates
  const createdMatches = new Set<string>();

  // Create 3 matches per person (curated)
  for (let i = 0; i < pastEventMales.length; i++) {
    for (let j = 0; j < 3; j++) {
      const femaleIndex = (i * 3 + j) % pastEventFemales.length;
      const matchKey = `${pastEventMales[i].id}-${pastEventFemales[femaleIndex].id}`;
      const compatScore = 70 + Math.random() * 30;

      createdMatches.add(matchKey);

      const day30FollowUp: JsonValue | undefined =
        compatScore > 85
          ? {
              firstDateHappened: true,
              chemistryRating: 4,
              planToSeeAgain: true,
              notes: "We had a great time!",
            }
          : undefined;

      await prisma.match.create({
        data: {
          eventId: pastEvent.id,
          applicantId: pastEventMales[i].id,
          partnerId: pastEventFemales[femaleIndex].id,
          type: "CURATED",
          compatibilityScore: compatScore,
          outcome: matchOutcomes[matchCount % matchOutcomes.length],
          contactExchanged: compatScore > 85 ? true : Math.random() > 0.5,
          contactExchangedAt:
            compatScore > 85 ? new Date(2025, 11, 15, 22, 0) : null,
          ...(day30FollowUp ? { day30FollowUp } : {}),
          createdAt: new Date(2025, 11, 14), // Day before event
        },
      });

      matchCount++;
    }
  }

  // Create some mutual speed dating matches (only if not already matched)
  let mutualMatchCount = 0;
  for (let i = 0; i < pastEventMales.length && mutualMatchCount < 5; i++) {
    for (let j = 0; j < pastEventFemales.length && mutualMatchCount < 5; j++) {
      const matchKey = `${pastEventMales[i].id}-${pastEventFemales[j].id}`;

      // Only create if this pairing doesn't already exist
      if (!createdMatches.has(matchKey)) {
        await prisma.match.create({
          data: {
            eventId: pastEvent.id,
            applicantId: pastEventMales[i].id,
            partnerId: pastEventFemales[j].id,
            type: "MUTUAL_SPEED",
            compatibilityScore: null,
            outcome: (
              ["FIRST_DATE_SCHEDULED", "DATING", "NO_CONNECTION"] as const
            )[Math.floor(Math.random() * 3)] as MatchOutcome,
            contactExchanged: true,
            contactExchangedAt: new Date(2025, 11, 15, 21, 0),
            createdAt: new Date(2025, 11, 15, 20, 30), // During event
          },
        });

        createdMatches.add(matchKey);
        mutualMatchCount++;
      }
    }
  }

  console.log(
    `✓ Created ${matchCount + mutualMatchCount} matches for past event`,
  );

  // ============================================
  // ADMIN ACTIONS
  // ============================================

  // Log some admin actions
  type AdminActionType =
    | "APPROVE_APPLICATION"
    | "REJECT_APPLICATION"
    | "CREATE_EVENT"
    | "SEND_INVITATIONS"
    | "RECORD_MATCH"
    | "UPDATE_MATCH_OUTCOME"
    | "MANUAL_ADJUSTMENT";

  const adminActions: Array<{
    type: AdminActionType;
    targetId: string;
    targetType: string;
    description: string;
    metadata: JsonValue | undefined;
  }> = [
    {
      type: "APPROVE_APPLICATION",
      targetId: applicants[0].id,
      targetType: "applicant",
      description: `Approved application for ${applicants[0].id}`,
      metadata: { compatibilityScore: applicants[0].compatibilityScore },
    },
    {
      type: "CREATE_EVENT",
      targetId: pastEvent.id,
      targetType: "event",
      description: "Created December event",
      metadata: { eventName: pastEvent.name },
    },
    {
      type: "SEND_INVITATIONS",
      targetId: pastEvent.id,
      targetType: "event",
      description: "Sent invitations for December event",
      metadata: { invitationCount: 20 },
    },
  ];

  for (const action of adminActions) {
    await prisma.adminAction.create({
      data: {
        userId: adminUser.id,
        type: action.type,
        targetId: action.targetId,
        targetType: action.targetType,
        description: action.description,
        ...(action.metadata !== null ? { metadata: action.metadata } : {}),
        createdAt: new Date(2025, 10, 15),
      },
    });
  }

  console.log("✓ Created admin actions");

  // ============================================
  // SUMMARY
  // ============================================

  const counts = {
    users: await prisma.user.count(),
    applicants: await prisma.applicant.count(),
    questionnaireAnswers: await prisma.questionnaireAnswer.count(),
    payments: await prisma.payment.count(),
    events: await prisma.event.count(),
    eventInvitations: await prisma.eventInvitation.count(),
    matches: await prisma.match.count(),
    adminActions: await prisma.adminAction.count(),
  };

  console.log("\n✅ Seed completed successfully!\n");
  console.log("📊 Summary:");
  console.log(
    `   Users: ${counts.users} (1 admin, ${counts.users - 1} applicants)`,
  );
  console.log(`   Applicants: ${counts.applicants} (15 male, 15 female)`);
  console.log(`   Questionnaire Answers: ${counts.questionnaireAnswers}`);
  console.log(`   Payments: ${counts.payments}`);
  console.log(`   Events: ${counts.events} (1 past, 1 upcoming)`);
  console.log(`   Event Invitations: ${counts.eventInvitations}`);
  console.log(`   Matches: ${counts.matches}`);
  console.log(`   Admin Actions: ${counts.adminActions}`);
  console.log("\n🎯 Test Credentials:");
  console.log(`   Admin: admin@realitymatchmaking.com`);
  console.log(`   Applicant: james.smith@example.com (and 29 others)`);
  console.log('\n🚀 Next: Run "npx prisma studio" to view your data\n');
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
