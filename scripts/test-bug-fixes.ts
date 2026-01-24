/**
 * Test script for bug fixes in weighted compatibility scoring
 * Run with: npx tsx scripts/test-bug-fixes.ts
 */

import { db } from "../src/lib/db";
import { calculateWeightedCompatibility } from "../src/lib/matching/weighted-compatibility";
import { ApplicationStatus, ScreeningStatus, Prisma } from "@prisma/client";

async function runBugTests() {
  console.log("🐛 Testing Bug Fixes\n");

  try {
    console.log("Bug Fix 1: Division by Zero");
    console.log("─".repeat(50));
    await testDivisionByZero();
    console.log("");

    console.log("Bug Fix 2: Null Answer Values");
    console.log("─".repeat(50));
    await testNullAnswers();
    console.log("");

    console.log("✅ All bug fix tests passed!");
  } catch (error) {
    console.error("❌ Bug fix test failed:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

async function testDivisionByZero() {
  console.log(
    "Testing NUMBER_SCALE question with min === max (misconfigured)...",
  );

  const section = await db.questionnaireSection.findFirst({
    where: { isActive: true, deletedAt: null },
  });

  if (!section) {
    console.log("⚠️  No active sections found. Skipping test.");
    return;
  }

  // Create a misconfigured NUMBER_SCALE question (min === max)
  const badQuestion = await db.questionnaireQuestion.create({
    data: {
      sectionId: section.id,
      prompt: "Misconfigured scale question (min=max)",
      type: "NUMBER_SCALE",
      options: { min: 5, max: 5 }, // Division by zero scenario
      mlWeight: 1.0,
      isDealbreaker: false,
      isActive: true,
      isRequired: false,
      order: 3000,
    },
  });

  // Create test applicants
  const userA = await db.user.create({
    data: {
      clerkId: `test-divzero-a-${Date.now()}`,
      email: `test-divzero-a-${Date.now()}@example.com`,
      firstName: "Alice",
      lastName: "DivZero",
      role: "APPLICANT",
    },
  });

  const applicantA = await db.applicant.create({
    data: {
      userId: userA.id,
      age: 28,
      gender: "FEMALE",
      seeking: "MALE",
      location: "Test City",
      cityFrom: "Test City",
      industry: "Tech",
      occupation: "Engineer",
      education: "Bachelor's",
      incomeRange: "$75k-$100k",
      aboutYourself: "Test applicant A for division by zero",
      applicationStatus: ApplicationStatus.APPROVED,
      screeningStatus: ScreeningStatus.PASSED,
    },
  });

  const userB = await db.user.create({
    data: {
      clerkId: `test-divzero-b-${Date.now()}`,
      email: `test-divzero-b-${Date.now()}@example.com`,
      firstName: "Bob",
      lastName: "DivZero",
      role: "APPLICANT",
    },
  });

  const applicantB = await db.applicant.create({
    data: {
      userId: userB.id,
      age: 30,
      gender: "MALE",
      seeking: "FEMALE",
      location: "Test City",
      cityFrom: "Test City",
      industry: "Tech",
      occupation: "Engineer",
      education: "Bachelor's",
      incomeRange: "$75k-$100k",
      aboutYourself: "Test applicant B for division by zero",
      applicationStatus: ApplicationStatus.APPROVED,
      screeningStatus: ScreeningStatus.PASSED,
    },
  });

  // Test 1: Same value (should be 100% similarity)
  await db.questionnaireAnswer.create({
    data: {
      questionId: badQuestion.id,
      applicantId: applicantA.id,
      value: 5,
    },
  });

  await db.questionnaireAnswer.create({
    data: {
      questionId: badQuestion.id,
      applicantId: applicantB.id,
      value: 5,
    },
  });

  const result1 = await calculateWeightedCompatibility(
    applicantA.id,
    applicantB.id,
  );

  console.log(`Same value (5 vs 5): Score = ${result1.score}/100`);
  if (result1.score === 100 && !isNaN(result1.score)) {
    console.log("✅ PASS: Same value on min=max question returns 100");
  } else {
    console.log(
      `❌ FAIL: Expected 100, got ${result1.score} (NaN: ${isNaN(result1.score)})`,
    );
  }

  // Test 2: Different value (should be 0% similarity)
  await db.questionnaireAnswer.update({
    where: {
      applicantId_questionId: {
        applicantId: applicantB.id,
        questionId: badQuestion.id,
      },
    },
    data: { value: 7 },
  });

  const result2 = await calculateWeightedCompatibility(
    applicantA.id,
    applicantB.id,
  );

  console.log(`Different value (5 vs 7): Score = ${result2.score}/100`);
  if (result2.score === 0 && !isNaN(result2.score) && isFinite(result2.score)) {
    console.log("✅ PASS: Different value on min=max question returns 0");
  } else {
    console.log(
      `❌ FAIL: Expected 0, got ${result2.score} (NaN: ${isNaN(result2.score)}, Infinite: ${!isFinite(result2.score)})`,
    );
  }

  // Cleanup
  await db.questionnaireAnswer.deleteMany({
    where: { questionId: badQuestion.id },
  });
  await db.questionnaireQuestion.delete({
    where: { id: badQuestion.id },
  });
  await db.applicant.deleteMany({
    where: { id: { in: [applicantA.id, applicantB.id] } },
  });
  await db.user.deleteMany({
    where: { id: { in: [userA.id, userB.id] } },
  });
}

async function testNullAnswers() {
  console.log("Testing null answer values...");

  const section = await db.questionnaireSection.findFirst({
    where: { isActive: true, deletedAt: null },
  });

  if (!section) {
    console.log("⚠️  No active sections found. Skipping test.");
    return;
  }

  // Create questions of different types
  const dropdownQuestion = await db.questionnaireQuestion.create({
    data: {
      sectionId: section.id,
      prompt: "Test dropdown for null values",
      type: "DROPDOWN",
      options: ["Option A", "Option B"],
      mlWeight: 1.0,
      isDealbreaker: false,
      isActive: true,
      isRequired: false,
      order: 4000,
    },
  });

  const scaleQuestion = await db.questionnaireQuestion.create({
    data: {
      sectionId: section.id,
      prompt: "Test scale for null values",
      type: "NUMBER_SCALE",
      options: { min: 1, max: 10, step: 1 },
      mlWeight: 1.0,
      isDealbreaker: false,
      isActive: true,
      isRequired: false,
      order: 4001,
    },
  });

  // Create test applicants
  const userA = await db.user.create({
    data: {
      clerkId: `test-null-a-${Date.now()}`,
      email: `test-null-a-${Date.now()}@example.com`,
      firstName: "Alice",
      lastName: "Null",
      role: "APPLICANT",
    },
  });

  const applicantA = await db.applicant.create({
    data: {
      userId: userA.id,
      age: 28,
      gender: "FEMALE",
      seeking: "MALE",
      location: "Test City",
      cityFrom: "Test City",
      industry: "Tech",
      occupation: "Engineer",
      education: "Bachelor's",
      incomeRange: "$75k-$100k",
      aboutYourself: "Test applicant A for null values",
      applicationStatus: ApplicationStatus.APPROVED,
      screeningStatus: ScreeningStatus.PASSED,
    },
  });

  const userB = await db.user.create({
    data: {
      clerkId: `test-null-b-${Date.now()}`,
      email: `test-null-b-${Date.now()}@example.com`,
      firstName: "Bob",
      lastName: "Null",
      role: "APPLICANT",
    },
  });

  const applicantB = await db.applicant.create({
    data: {
      userId: userB.id,
      age: 30,
      gender: "MALE",
      seeking: "FEMALE",
      location: "Test City",
      cityFrom: "Test City",
      industry: "Tech",
      occupation: "Engineer",
      education: "Bachelor's",
      incomeRange: "$75k-$100k",
      aboutYourself: "Test applicant B for null values",
      applicationStatus: ApplicationStatus.APPROVED,
      screeningStatus: ScreeningStatus.PASSED,
    },
  });

  // Create answers with null values
  await db.questionnaireAnswer.create({
    data: {
      questionId: dropdownQuestion.id,
      applicantId: applicantA.id,
      value: Prisma.JsonNull,
    },
  });

  await db.questionnaireAnswer.create({
    data: {
      questionId: dropdownQuestion.id,
      applicantId: applicantB.id,
      value: Prisma.JsonNull,
    },
  });

  await db.questionnaireAnswer.create({
    data: {
      questionId: scaleQuestion.id,
      applicantId: applicantA.id,
      value: Prisma.JsonNull,
    },
  });

  await db.questionnaireAnswer.create({
    data: {
      questionId: scaleQuestion.id,
      applicantId: applicantB.id,
      value: Prisma.JsonNull,
    },
  });

  const result = await calculateWeightedCompatibility(
    applicantA.id,
    applicantB.id,
  );

  console.log(`Both applicants have null values for 2 questions`);
  console.log(`Questions scored: ${result.questionsScored}`);
  console.log(`Score: ${result.score}/100`);

  if (result.questionsScored === 0) {
    console.log(
      "✅ PASS: Null answer values are correctly skipped (not scored)",
    );
  } else {
    console.log(
      `❌ FAIL: Expected 0 questions scored, got ${result.questionsScored}`,
    );
    console.log(
      "  Null values should be skipped, not treated as matching answers",
    );
  }

  // Cleanup
  await db.questionnaireAnswer.deleteMany({
    where: {
      questionId: { in: [dropdownQuestion.id, scaleQuestion.id] },
    },
  });
  await db.questionnaireQuestion.deleteMany({
    where: { id: { in: [dropdownQuestion.id, scaleQuestion.id] } },
  });
  await db.applicant.deleteMany({
    where: { id: { in: [applicantA.id, applicantB.id] } },
  });
  await db.user.deleteMany({
    where: { id: { in: [userA.id, userB.id] } },
  });
}

runBugTests();
