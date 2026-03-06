import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const pages = await prisma.questionnairePage.findMany({
    where: { deletedAt: null },
    select: { title: true, order: true, forResearch: true },
    orderBy: { order: "asc" },
  });

  console.log("\nQuestionnaire Pages:");
  console.log("=".repeat(70));
  pages.forEach((p) => {
    const badge = p.forResearch ? " [RESEARCH ONLY]" : "";
    console.log(`Page ${p.order + 1}: ${p.title}${badge}`);
  });
  console.log("=".repeat(70));

  const researchPages = pages.filter((p) => p.forResearch);
  console.log(`\n✓ Total pages: ${pages.length}`);
  console.log(`✓ Research-only pages: ${researchPages.length}`);
  if (researchPages.length > 0) {
    console.log(`  - ${researchPages.map((p) => p.title).join(", ")}`);
  }
}

main().finally(() => prisma.$disconnect());
