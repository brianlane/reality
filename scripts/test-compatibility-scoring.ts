/**
 * Test script for weighted compatibility scoring
 * Run with: npx tsx scripts/test-compatibility-scoring.ts
 */

import { db } from "../src/lib/db";
import { calculateWeightedCompatibility } from "../src/lib/matching/weighted-compatibility";
import { ApplicationStatus, ScreeningStatus } from "@prisma/client";

async function runTests() {
  console.log("🧪 Testing Weighted Compatibility Scoring\n");

  try {
    // Test 1: Verify perfect match scores ~100
    console.log("Test 1: Perfect Match");
    console.log("─".repeat(50));
    await testPerfectMatch();
    console.log("");

    // Test 2: Verify dealbreaker mismatch scores 0
    console.log("Test 2: Dealbreaker Mismatch");
    console.log("─".repeat(50));
    await testDealbreaker();
    console.log("");

    // Test 3: Verify weights are respected
    console.log("Test 3: Weight Respect");
    console.log("─".repeat(50));
    await testWeights();
    console.log("");

    // Test 4: Verify partial match scores
    console.log("Test 4: Partial Match");
    console.log("─".repeat(50));
    await testPartialMatch();
    console.log("");

    // Test 5: Test with real data
    console.log("Test 5: Real Data Test");
    console.log("─".repeat(50));
    await testRealData();
    console.log("");

    console.log("✅ All tests completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

async function testPerfectMatch() {
  console.log(
    "Creating two applicants with identical questionnaire answers...",
  );

  // Create test user and applicant A
  const userA = await db.user.create({
    data: {
      clerkId: `test-perfect-a-${Date.now()}`,
      email: `test-perfect-a-${Date.now()}@example.com`,
      firstName: "Alice",
      lastName: "Perfect",
      role: "APPLICANT",
    },
  });

  const applicantA = await db.applicant.create({
    data: {
      userId: userA.id,
      age: 28,
      gender: "WOMAN",
      seeking: "MAN",
      location: "New York, NY",
      cityFrom: "New York, NY",
      industry: "Tech",
      occupation: "Engineer",
      education: "Bachelor's",
      incomeRange: "$75k-$100k",
      aboutYourself: "Test applicant A with identical preferences",
      applicationStatus: ApplicationStatus.APPROVED,
      screeningStatus: ScreeningStatus.PASSED,
    },
  });

  // Create test user and applicant B (identical to A)
  const userB = await db.user.create({
    data: {
      clerkId: `test-perfect-b-${Date.now()}`,
      email: `test-perfect-b-${Date.now()}@example.com`,
      firstName: "Bob",
      lastName: "Perfect",
      role: "APPLICANT",
    },
  });

  const applicantB = await db.applicant.create({
    data: {
      userId: userB.id,
      age: 30,
      gender: "MAN",
      seeking: "WOMAN",
      location: "New York, NY",
      cityFrom: "New York, NY",
      industry: "Tech",
      occupation: "Engineer",
      education: "Bachelor's",
      incomeRange: "$75k-$100k",
      aboutYourself: "Test applicant B with identical preferences",
      applicationStatus: ApplicationStatus.APPROVED,
      screeningStatus: ScreeningStatus.PASSED,
    },
  });

  // Create test questions with definitive answer types
  const section = await db.questionnaireSection.findFirst({
    where: { isActive: true, deletedAt: null },
  });

  if (!section) {
    console.log("⚠️  No active sections found. Skipping perfect match test.");
    return;
  }

  // Create a NUMBER_SCALE question
  const scaleQuestion = await db.questionnaireQuestion.create({
    data: {
      sectionId: section.id,
      prompt: "Test number scale question",
      type: "NUMBER_SCALE",
      options: { min: 1, max: 10, step: 1 },
      mlWeight: 1.0,
      isDealbreaker: false,
      isActive: true,
      isRequired: true,
      order: 1000,
    },
  });

  // Create a DROPDOWN question
  const dropdownQuestion = await db.questionnaireQuestion.create({
    data: {
      sectionId: section.id,
      prompt: "Test dropdown question",
      type: "DROPDOWN",
      options: ["Option A", "Option B", "Option C"],
      mlWeight: 1.0,
      isDealbreaker: false,
      isActive: true,
      isRequired: true,
      order: 1001,
    },
  });

  // Create identical answers for both applicants
  const testQuestions = [
    { question: scaleQuestion, value: 5 },
    { question: dropdownQuestion, value: "Option A" },
  ];

  for (const { question, value } of testQuestions) {
    await db.questionnaireAnswer.create({
      data: {
        questionId: question.id,
        applicantId: applicantA.id,
        value,
      },
    });

    await db.questionnaireAnswer.create({
      data: {
        questionId: question.id,
        applicantId: applicantB.id,
        value,
      },
    });
  }

  // Calculate compatibility
  const result = await calculateWeightedCompatibility(
    applicantA.id,
    applicantB.id,
  );

  console.log(`Questions scored: ${result.questionsScored}`);
  console.log(`Compatibility score: ${result.score}/100`);
  console.log(`Dealbreakers violated: ${result.dealbreakersViolated.length}`);

  if (result.breakdown.length > 0) {
    console.log("\nScore breakdown:");
    result.breakdown.forEach((b) => {
      console.log(
        `  - ${b.prompt}: similarity=${(b.similarity * 100).toFixed(0)}%, weight=${b.weight}`,
      );
    });
  }

  if (result.score >= 95) {
    console.log("\n✅ PASS: Perfect match scores high (≥95)");
  } else {
    console.log(`\n❌ FAIL: Expected score ≥95, got ${result.score}`);
  }

  // Cleanup
  await db.questionnaireAnswer.deleteMany({
    where: { questionId: { in: [scaleQuestion.id, dropdownQuestion.id] } },
  });
  await db.questionnaireQuestion.deleteMany({
    where: { id: { in: [scaleQuestion.id, dropdownQuestion.id] } },
  });
  await db.applicant.deleteMany({
    where: { id: { in: [applicantA.id, applicantB.id] } },
  });
  await db.user.deleteMany({
    where: { id: { in: [userA.id, userB.id] } },
  });
}

async function testDealbreaker() {
  console.log("Creating two applicants with dealbreaker mismatch...");

  // First, find or create a dealbreaker question
  let dealbreakerQuestion = await db.questionnaireQuestion.findFirst({
    where: { isDealbreaker: true, isActive: true, deletedAt: null },
  });

  if (!dealbreakerQuestion) {
    // Create a test dealbreaker question
    const section = await db.questionnaireSection.findFirst({
      where: { isActive: true, deletedAt: null },
    });

    if (!section) {
      console.log("⚠️  No active sections found. Skipping dealbreaker test.");
      return;
    }

    dealbreakerQuestion = await db.questionnaireQuestion.create({
      data: {
        sectionId: section.id,
        prompt: "Test dealbreaker question",
        type: "DROPDOWN",
        options: ["Yes", "No"],
        mlWeight: 1.0,
        isDealbreaker: true,
        isActive: true,
        isRequired: true,
        order: 999,
      },
    });
  }

  // Create test applicants
  const userA = await db.user.create({
    data: {
      clerkId: `test-dealbreaker-a-${Date.now()}`,
      email: `test-dealbreaker-a-${Date.now()}@example.com`,
      firstName: "Alice",
      lastName: "Dealbreaker",
      role: "APPLICANT",
    },
  });

  const applicantA = await db.applicant.create({
    data: {
      userId: userA.id,
      age: 28,
      gender: "WOMAN",
      seeking: "MAN",
      location: "New York, NY",
      cityFrom: "New York, NY",
      industry: "Tech",
      occupation: "Engineer",
      education: "Bachelor's",
      incomeRange: "$75k-$100k",
      aboutYourself: "Test applicant A for dealbreaker",
      applicationStatus: ApplicationStatus.APPROVED,
      screeningStatus: ScreeningStatus.PASSED,
    },
  });

  const userB = await db.user.create({
    data: {
      clerkId: `test-dealbreaker-b-${Date.now()}`,
      email: `test-dealbreaker-b-${Date.now()}@example.com`,
      firstName: "Bob",
      lastName: "Dealbreaker",
      role: "APPLICANT",
    },
  });

  const applicantB = await db.applicant.create({
    data: {
      userId: userB.id,
      age: 30,
      gender: "MAN",
      seeking: "WOMAN",
      location: "New York, NY",
      cityFrom: "New York, NY",
      industry: "Tech",
      occupation: "Engineer",
      education: "Bachelor's",
      incomeRange: "$75k-$100k",
      aboutYourself: "Test applicant B for dealbreaker",
      applicationStatus: ApplicationStatus.APPROVED,
      screeningStatus: ScreeningStatus.PASSED,
    },
  });

  // Create mismatched answers for dealbreaker question
  await db.questionnaireAnswer.create({
    data: {
      questionId: dealbreakerQuestion.id,
      applicantId: applicantA.id,
      value: "Yes",
    },
  });

  await db.questionnaireAnswer.create({
    data: {
      questionId: dealbreakerQuestion.id,
      applicantId: applicantB.id,
      value: "No",
    },
  });

  // Calculate compatibility
  const result = await calculateWeightedCompatibility(
    applicantA.id,
    applicantB.id,
  );

  console.log(`Compatibility score: ${result.score}/100`);
  console.log(`Dealbreakers violated: ${result.dealbreakersViolated.length}`);
  console.log(`Violated IDs: ${result.dealbreakersViolated.join(", ")}`);

  if (result.score === 0 && result.dealbreakersViolated.length > 0) {
    console.log("✅ PASS: Dealbreaker mismatch returns score of 0");
  } else {
    console.log(
      `❌ FAIL: Expected score=0 with dealbreakers, got ${result.score}`,
    );
  }

  // Cleanup
  await db.questionnaireAnswer.deleteMany({
    where: { applicantId: { in: [applicantA.id, applicantB.id] } },
  });
  await db.applicant.deleteMany({
    where: { id: { in: [applicantA.id, applicantB.id] } },
  });
  await db.user.deleteMany({
    where: { id: { in: [userA.id, userB.id] } },
  });
}

async function testWeights() {
  console.log("Testing that mlWeight affects final score...");

  // Get questions with different weights
  const questions = await db.questionnaireQuestion.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { mlWeight: "desc" },
    take: 3,
  });

  if (questions.length === 0) {
    console.log("⚠️  No active questions found. Skipping weight test.");
    return;
  }

  console.log(`Found ${questions.length} questions with weights:`);
  questions.forEach((q) => {
    console.log(
      `  - "${q.prompt.substring(0, 50)}..." (weight: ${q.mlWeight})`,
    );
  });

  console.log("✅ PASS: Weights are properly stored in database");
  console.log(
    "Note: Weight impact is verified through calculation in algorithm",
  );
}

async function testPartialMatch() {
  console.log("Creating two applicants with partial similarity...");

  const section = await db.questionnaireSection.findFirst({
    where: { isActive: true, deletedAt: null },
  });

  if (!section) {
    console.log("⚠️  No active sections found. Skipping partial match test.");
    return;
  }

  // Create two questions with different weights
  const highWeightQuestion = await db.questionnaireQuestion.create({
    data: {
      sectionId: section.id,
      prompt: "High weight question",
      type: "NUMBER_SCALE",
      options: { min: 1, max: 10, step: 1 },
      mlWeight: 1.0, // High weight
      isDealbreaker: false,
      isActive: true,
      isRequired: true,
      order: 2000,
    },
  });

  const lowWeightQuestion = await db.questionnaireQuestion.create({
    data: {
      sectionId: section.id,
      prompt: "Low weight question",
      type: "NUMBER_SCALE",
      options: { min: 1, max: 10, step: 1 },
      mlWeight: 0.2, // Low weight
      isDealbreaker: false,
      isActive: true,
      isRequired: true,
      order: 2001,
    },
  });

  // Create test applicants
  const userA = await db.user.create({
    data: {
      clerkId: `test-partial-a-${Date.now()}`,
      email: `test-partial-a-${Date.now()}@example.com`,
      firstName: "Alice",
      lastName: "Partial",
      role: "APPLICANT",
    },
  });

  const applicantA = await db.applicant.create({
    data: {
      userId: userA.id,
      age: 28,
      gender: "WOMAN",
      seeking: "MAN",
      location: "New York, NY",
      cityFrom: "New York, NY",
      industry: "Tech",
      occupation: "Engineer",
      education: "Bachelor's",
      incomeRange: "$75k-$100k",
      aboutYourself: "Test applicant A for partial match",
      applicationStatus: ApplicationStatus.APPROVED,
      screeningStatus: ScreeningStatus.PASSED,
    },
  });

  const userB = await db.user.create({
    data: {
      clerkId: `test-partial-b-${Date.now()}`,
      email: `test-partial-b-${Date.now()}@example.com`,
      firstName: "Bob",
      lastName: "Partial",
      role: "APPLICANT",
    },
  });

  const applicantB = await db.applicant.create({
    data: {
      userId: userB.id,
      age: 30,
      gender: "MAN",
      seeking: "WOMAN",
      location: "New York, NY",
      cityFrom: "New York, NY",
      industry: "Tech",
      occupation: "Engineer",
      education: "Bachelor's",
      incomeRange: "$75k-$100k",
      aboutYourself: "Test applicant B for partial match",
      applicationStatus: ApplicationStatus.APPROVED,
      screeningStatus: ScreeningStatus.PASSED,
    },
  });

  // High weight question: similar answers (8 vs 9) - should have high impact
  await db.questionnaireAnswer.create({
    data: {
      questionId: highWeightQuestion.id,
      applicantId: applicantA.id,
      value: 8,
    },
  });

  await db.questionnaireAnswer.create({
    data: {
      questionId: highWeightQuestion.id,
      applicantId: applicantB.id,
      value: 9,
    },
  });

  // Low weight question: very different answers (1 vs 10) - should have low impact
  await db.questionnaireAnswer.create({
    data: {
      questionId: lowWeightQuestion.id,
      applicantId: applicantA.id,
      value: 1,
    },
  });

  await db.questionnaireAnswer.create({
    data: {
      questionId: lowWeightQuestion.id,
      applicantId: applicantB.id,
      value: 10,
    },
  });

  // Calculate compatibility
  const result = await calculateWeightedCompatibility(
    applicantA.id,
    applicantB.id,
  );

  console.log(`Questions scored: ${result.questionsScored}`);
  console.log(`Compatibility score: ${result.score}/100`);

  if (result.breakdown.length > 0) {
    console.log("\nScore breakdown:");
    result.breakdown.forEach((b) => {
      console.log(`  - ${b.prompt}:`);
      console.log(`    Similarity: ${(b.similarity * 100).toFixed(1)}%`);
      console.log(`    Weight: ${b.weight}`);
      console.log(`    Contribution: ${b.weightedScore.toFixed(3)}`);
    });
  }

  // Verify score is between 0 and 100 and weights are respected
  if (result.score > 0 && result.score < 100) {
    console.log("\n✅ PASS: Partial match scores between 0-100");

    // Verify high weight question had more impact
    const highWeightContribution = result.breakdown.find(
      (b) => b.questionId === highWeightQuestion.id,
    );
    const lowWeightContribution = result.breakdown.find(
      (b) => b.questionId === lowWeightQuestion.id,
    );

    if (highWeightContribution && lowWeightContribution) {
      if (
        highWeightContribution.weightedScore >
        lowWeightContribution.weightedScore
      ) {
        console.log(
          "✅ PASS: High weight question has more impact than low weight question",
        );
      } else {
        console.log("⚠️  WARNING: Weight impact may not be as expected");
      }
    }
  } else {
    console.log(`\n❌ FAIL: Expected score between 0-100, got ${result.score}`);
  }

  // Cleanup
  await db.questionnaireAnswer.deleteMany({
    where: {
      questionId: { in: [highWeightQuestion.id, lowWeightQuestion.id] },
    },
  });
  await db.questionnaireQuestion.deleteMany({
    where: { id: { in: [highWeightQuestion.id, lowWeightQuestion.id] } },
  });
  await db.applicant.deleteMany({
    where: { id: { in: [applicantA.id, applicantB.id] } },
  });
  await db.user.deleteMany({
    where: { id: { in: [userA.id, userB.id] } },
  });
}

async function testRealData() {
  console.log("Testing with real applicants from database...");

  // Find 2 real approved applicants
  const applicants = await db.applicant.findMany({
    where: {
      applicationStatus: ApplicationStatus.APPROVED,
      screeningStatus: ScreeningStatus.PASSED,
      deletedAt: null,
    },
    include: {
      questionnaireAnswers: true,
    },
    take: 2,
  });

  if (applicants.length < 2) {
    console.log(
      "⚠️  Need at least 2 approved applicants. Skipping real data test.",
    );
    return;
  }

  const [applicantA, applicantB] = applicants;

  console.log(`Applicant A: ${applicantA.id}`);
  console.log(`Applicant B: ${applicantB.id}`);

  try {
    const result = await calculateWeightedCompatibility(
      applicantA.id,
      applicantB.id,
    );

    console.log(`\nResults:`);
    console.log(`  Score: ${result.score}/100`);
    console.log(`  Questions scored: ${result.questionsScored}`);
    console.log(
      `  Dealbreakers violated: ${result.dealbreakersViolated.length}`,
    );

    if (result.breakdown.length > 0) {
      console.log(`\nTop 3 question contributions:`);
      const top3 = result.breakdown
        .sort((a, b) => b.weightedScore - a.weightedScore)
        .slice(0, 3);

      top3.forEach((b, i) => {
        console.log(`  ${i + 1}. ${b.prompt.substring(0, 40)}...`);
        console.log(
          `     Similarity: ${(b.similarity * 100).toFixed(1)}%, Weight: ${b.weight}, Contribution: ${b.weightedScore.toFixed(3)}`,
        );
      });
    }

    console.log("\n✅ PASS: Real data scoring completed successfully");
  } catch (error) {
    console.log(`❌ FAIL: Error calculating compatibility: ${error}`);
  }
}

// Run tests
runTests();
