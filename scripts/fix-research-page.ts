/**
 * fix-research-page.ts
 *
 * One-time fix script: reads finalDraftQuestions.md, finds pages annotated
 * with "(Research Participants Only)", and ensures those pages (and their
 * sections) have forResearch=true in the database.
 *
 * This is tolerant of minor title mismatches by using a case-insensitive
 * contains search instead of exact equality.
 *
 * Usage: npx tsx scripts/fix-research-page.ts
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { db } from "../src/lib/db";

/**
 * Parse the markdown and return the clean titles of all pages that should
 * have forResearch=true (i.e., those with the "(Research Participants Only)"
 * suffix on their ## Page header line).
 */
function findResearchPageTitles(content: string): string[] {
  const titles: string[] = [];
  for (const line of content.split("\n")) {
    const m = line.match(/^## Page \d+:\s*(.+)$/);
    if (!m) continue;
    const raw = m[1].trim();
    if (/\(Research Participants Only\)\s*$/i.test(raw)) {
      const cleanTitle = raw
        .replace(/\s*\(Research Participants Only\)\s*$/i, "")
        .trim();
      titles.push(cleanTitle);
    }
  }
  return titles;
}

async function main() {
  console.log("🔧 Research page forResearch fix script\n");

  const mdPath = path.join(__dirname, "..", "finalDraftQuestions.md");

  if (!fs.existsSync(mdPath)) {
    console.error(`❌ Markdown file not found: ${mdPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(mdPath, "utf-8");
  const researchTitles = findResearchPageTitles(content);

  if (researchTitles.length === 0) {
    console.log(
      "ℹ️  No pages with (Research Participants Only) found in markdown.",
    );
    return;
  }

  console.log(
    `📄 Research-only page titles from MD: ${JSON.stringify(researchTitles)}\n`,
  );

  let totalPagesFixed = 0;
  let totalSectionsFixed = 0;

  for (const title of researchTitles) {
    // Case-insensitive contains search to tolerate minor DB/MD title drift
    const pages = await db.questionnairePage.findMany({
      where: {
        deletedAt: null,
        title: { contains: title, mode: "insensitive" },
      },
    });

    console.log(`Searching for DB pages matching "${title}":`);

    if (pages.length === 0) {
      console.warn(`  ⚠️  No active DB pages found matching "${title}"`);
      continue;
    }

    for (const page of pages) {
      console.log(
        `  Found: id=${page.id}, title="${page.title}", forResearch=${page.forResearch}`,
      );

      if (!page.forResearch) {
        await db.questionnairePage.update({
          where: { id: page.id },
          data: { forResearch: true },
        });
        totalPagesFixed++;

        // Also update all sections of this page
        const sectionsUpdated = await db.questionnaireSection.updateMany({
          where: { pageId: page.id, deletedAt: null },
          data: { forResearch: true },
        });
        totalSectionsFixed += sectionsUpdated.count;

        console.log(
          `  ✓ Updated page + ${sectionsUpdated.count} section(s) to forResearch=true`,
        );
      } else {
        console.log(`  ✓ Already correct (forResearch=true)`);
      }
    }
    console.log();
  }

  if (totalPagesFixed > 0 || totalSectionsFixed > 0) {
    console.log(
      `✅ Fixed ${totalPagesFixed} page(s) and ${totalSectionsFixed} section(s).`,
    );
  } else {
    console.log("✅ No changes needed — all research pages already correct.");
  }
}

main()
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    process.exit(0);
  });
