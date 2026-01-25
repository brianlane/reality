import { db } from "../src/lib/db";

async function checkQuestions() {
  const questions = await db.questionnaireQuestion.findMany({
    where: { isActive: true, deletedAt: null },
    select: {
      id: true,
      prompt: true,
      type: true,
      options: true,
      mlWeight: true,
      isDealbreaker: true,
      _count: {
        select: {
          answers: true,
        },
      },
    },
  });

  console.log(`Found ${questions.length} active questions:\n`);

  questions.forEach((q, i) => {
    console.log(`${i + 1}. [${q.type}] ${q.prompt}`);
    console.log(`   Weight: ${q.mlWeight}, Dealbreaker: ${q.isDealbreaker}`);
    console.log(`   Options:`, q.options);
    console.log(`   Answers: ${q._count.answers}`);
    console.log("");
  });

  await db.$disconnect();
}

checkQuestions();
