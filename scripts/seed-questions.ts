/**
 * Seed Questions Script
 *
 * This script reads the finalDraftQuestions.md file and seeds the database
 * with questionnaire pages, sections, and questions.
 *
 * Usage: npx tsx scripts/seed-questions.ts
 *
 * The markdown file is the single source of truth for all questionnaire content.
 */

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { db } from "../src/lib/db";
import type { QuestionnaireQuestionType } from "@prisma/client";

// ============================================
// TYPE DEFINITIONS
// ============================================

interface ParsedQuestion {
  number: number;
  prompt: string;
  type: QuestionnaireQuestionType;
  options:
    | string[]
    | { min: number; max: number; step: number }
    | { minAge: number; maxAge: number }
    | { items: string[]; total: number }
    | { items: string[] }
    | null;
  helperText: string | null;
}

interface ParsedSection {
  title: string;
  order: number;
  questions: ParsedQuestion[];
}

interface ParsedPage {
  title: string;
  order: number;
  sections: ParsedSection[];
}

// ============================================
// MARKDOWN PARSING
// ============================================

/**
 * Parse the annotation from a question line
 * Examples:
 *   `[TEXT]`
 *   `[TEXTAREA]`
 *   `[SCALE:1-7]`
 *   `[DROPDOWN: opt1, opt2, opt3]`
 *   `[CHECKBOXES: opt1, opt2]`
 *   `[RADIO_7: opt1, opt2, opt3, opt4, opt5, opt6, opt7]`
 */
function parseAnnotation(line: string): {
  type: QuestionnaireQuestionType;
  options:
    | string[]
    | { min: number; max: number; step: number }
    | { minAge: number; maxAge: number }
    | { items: string[]; total: number }
    | { items: string[] }
    | null;
  cleanPrompt: string;
} {
  // Match the annotation pattern: `[TYPE]` or `[TYPE: options]`
  const annotationMatch = line.match(/`\[([^\]]+)\]`/);

  if (!annotationMatch) {
    // Default to TEXT if no annotation found
    return {
      type: "TEXT",
      options: null,
      cleanPrompt: line.replace(/^\d+\.\s*/, "").trim(),
    };
  }

  const annotation = annotationMatch[1];
  const cleanPrompt = line
    .replace(/`\[[^\]]+\]`/, "")
    .replace(/^\d+\.\s*/, "")
    .trim();

  // Parse SCALE type: SCALE:min-max
  if (annotation.startsWith("SCALE:")) {
    const scaleMatch = annotation.match(/SCALE:(\d+)-(\d+)/);
    if (scaleMatch) {
      return {
        type: "NUMBER_SCALE",
        options: {
          min: parseInt(scaleMatch[1], 10),
          max: parseInt(scaleMatch[2], 10),
          step: 1,
        },
        cleanPrompt,
      };
    }
  }

  // Parse DROPDOWN type: DROPDOWN: opt1, opt2, opt3
  if (annotation.startsWith("DROPDOWN:")) {
    const optionsStr = annotation.replace("DROPDOWN:", "").trim();
    const options = optionsStr.split(",").map((opt) => opt.trim());
    return {
      type: "DROPDOWN",
      options,
      cleanPrompt,
    };
  }

  // Parse CHECKBOXES type: CHECKBOXES: opt1, opt2, opt3
  if (annotation.startsWith("CHECKBOXES:")) {
    const optionsStr = annotation.replace("CHECKBOXES:", "").trim();
    const options = optionsStr.split(",").map((opt) => opt.trim());
    return {
      type: "CHECKBOXES",
      options,
      cleanPrompt,
    };
  }

  // Parse RADIO_7 type: RADIO_7: opt1, opt2, ..., opt7
  if (annotation.startsWith("RADIO_7:")) {
    const optionsStr = annotation.replace("RADIO_7:", "").trim();
    const options = optionsStr.split(",").map((opt) => opt.trim());
    return {
      type: "RADIO_7",
      options,
      cleanPrompt,
    };
  }

  // Parse POINT_ALLOCATION type: POINT_ALLOCATION:total: item1, item2, item3
  if (annotation.startsWith("POINT_ALLOCATION:")) {
    const rest = annotation.replace("POINT_ALLOCATION:", "").trim();
    const colonIndex = rest.indexOf(":");
    if (colonIndex > 0) {
      const total = parseInt(rest.substring(0, colonIndex).trim(), 10);
      const itemsStr = rest.substring(colonIndex + 1).trim();
      const items = itemsStr.split(",").map((item) => item.trim());
      return {
        type: "POINT_ALLOCATION",
        options: { items, total: isNaN(total) ? 100 : total },
        cleanPrompt,
      };
    }
  }

  // Parse RANKING type: RANKING: item1, item2, item3
  if (annotation.startsWith("RANKING:")) {
    const itemsStr = annotation.replace("RANKING:", "").trim();
    const items = itemsStr.split(",").map((item) => item.trim());
    return {
      type: "RANKING",
      options: { items },
      cleanPrompt,
    };
  }

  // AGE_RANGE type with default min/max options
  if (annotation === "AGE_RANGE") {
    return {
      type: "AGE_RANGE",
      options: { minAge: 18, maxAge: 80 },
      cleanPrompt,
    };
  }

  // Simple types
  const typeMap: Record<string, QuestionnaireQuestionType> = {
    TEXT: "TEXT",
    TEXTAREA: "TEXTAREA",
    RICH_TEXT: "RICH_TEXT",
    DROPDOWN: "DROPDOWN",
    CHECKBOXES: "CHECKBOXES",
  };

  const type = typeMap[annotation] || "TEXT";

  return {
    type,
    options: null,
    cleanPrompt,
  };
}

/**
 * Parse the markdown file and extract pages, sections, and questions
 */
function parseMarkdown(content: string): ParsedPage[] {
  const lines = content.split("\n");
  const pages: ParsedPage[] = [];

  let currentPage: ParsedPage | null = null;
  let currentSection: ParsedSection | null = null;
  let pageOrder = 0;
  let sectionOrder = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match page header: ## Page X: Title
    const pageMatch = line.match(/^## Page \d+:\s*(.+)$/);
    if (pageMatch) {
      if (currentPage) {
        if (currentSection) {
          currentPage.sections.push(currentSection);
        }
        pages.push(currentPage);
      }
      currentPage = {
        title: pageMatch[1].trim(),
        order: pageOrder++,
        sections: [],
      };
      currentSection = null;
      sectionOrder = 0;
      continue;
    }

    // Match section header: ### Section X: Title
    const sectionMatch = line.match(/^### Section [A-Z]:\s*(.+)$/);
    if (sectionMatch && currentPage) {
      if (currentSection) {
        currentPage.sections.push(currentSection);
      }
      currentSection = {
        title: sectionMatch[1].trim(),
        order: sectionOrder++,
        questions: [],
      };
      continue;
    }

    // Match question: starts with number and period
    const questionMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (questionMatch && currentPage) {
      // If no section exists, create a default one for this page
      if (!currentSection) {
        currentSection = {
          title: "Questions",
          order: sectionOrder++,
          questions: [],
        };
      }

      const questionNum = parseInt(questionMatch[1], 10);
      const questionText = questionMatch[2];

      const { type, options, cleanPrompt } = parseAnnotation(questionText);

      // Look ahead for helper text (indented lines starting with -)
      const helperLines: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const nextLine = lines[j];
        if (nextLine.match(/^\s{4}-\s+/)) {
          // Indented list item - this is helper text
          helperLines.push(nextLine.replace(/^\s{4}-\s+/, "• ").trim());
          j++;
        } else if (nextLine.trim() === "") {
          // Empty line, might be more helper text after
          j++;
        } else if (nextLine.match(/^\d+\.\s+/) || nextLine.match(/^###?\s+/)) {
          // Next question or section, stop
          break;
        } else {
          break;
        }
      }

      const helperText = helperLines.length > 0 ? helperLines.join("\n") : null;

      currentSection.questions.push({
        number: questionNum,
        prompt: cleanPrompt,
        type,
        options,
        helperText,
      });

      continue;
    }

    // Collect potential helper text (indented lines)
    if (line.match(/^\s{4}-\s+/) && currentSection) {
      // Already handled in look-ahead
      continue;
    }
  }

  // Don't forget the last page and section
  if (currentPage) {
    if (currentSection) {
      currentPage.sections.push(currentSection);
    }
    pages.push(currentPage);
  }

  return pages;
}

// ============================================
// DATABASE OPERATIONS
// ============================================

/**
 * Upsert pages, sections, and questions from parsed markdown.
 * This preserves existing data (applicant answers, research responses)
 * by matching on page order, section title+pageId, and question prompt+sectionId.
 *
 * - Existing pages/sections/questions are updated in place (IDs preserved)
 * - New pages/sections/questions are created
 * - Questions that no longer exist in the markdown are soft-deleted
 * - Answers are NEVER deleted
 */
async function upsertPages(pages: ParsedPage[]) {
  console.log(`\n📄 Upserting ${pages.length} pages...`);

  let totalSections = 0;
  let totalQuestions = 0;
  let updatedPages = 0;
  let createdPages = 0;
  let updatedSections = 0;
  let createdSections = 0;
  let updatedQuestions = 0;
  let createdQuestions = 0;

  // Track all active question IDs so we can soft-delete removed ones
  const activeQuestionIds: string[] = [];
  const activeSectionIds: string[] = [];
  const activePageIds: string[] = [];

  for (const page of pages) {
    // Find existing page by order
    const existingPage = await db.questionnairePage.findFirst({
      where: { order: page.order, deletedAt: null },
    });

    let pageId: string;
    if (existingPage) {
      // Update existing page
      await db.questionnairePage.update({
        where: { id: existingPage.id },
        data: { title: page.title },
      });
      pageId = existingPage.id;
      updatedPages++;
    } else {
      // Create new page
      const created = await db.questionnairePage.create({
        data: { title: page.title, order: page.order },
      });
      pageId = created.id;
      createdPages++;
    }
    activePageIds.push(pageId);

    console.log(
      `  ${existingPage ? "↻" : "✓"} Page ${page.order + 1}: ${page.title}`,
    );

    // Upsert sections for this page
    for (const section of page.sections) {
      // Find existing section by title and page
      const existingSection = await db.questionnaireSection.findFirst({
        where: {
          pageId,
          order: section.order,
          deletedAt: null,
        },
      });

      let sectionId: string;
      if (existingSection) {
        await db.questionnaireSection.update({
          where: { id: existingSection.id },
          data: { title: section.title, isActive: true },
        });
        sectionId = existingSection.id;
        updatedSections++;
      } else {
        const created = await db.questionnaireSection.create({
          data: {
            title: section.title,
            order: section.order,
            pageId,
            isActive: true,
          },
        });
        sectionId = created.id;
        createdSections++;
      }
      activeSectionIds.push(sectionId);
      totalSections++;

      // Upsert questions for this section
      // Get existing questions in this section for matching
      const existingQuestions = await db.questionnaireQuestion.findMany({
        where: { sectionId, deletedAt: null },
        orderBy: { order: "asc" },
      });

      // Track which existing questions have been consumed to prevent
      // the same question from matching multiple new questions
      const consumedIds = new Set<string>();

      for (let i = 0; i < section.questions.length; i++) {
        const question = section.questions[i];

        // Match by order position first, then by prompt text as fallback
        // Only consider questions not already consumed by a prior match
        const matchByOrder = existingQuestions.find(
          (q) => q.order === i && !consumedIds.has(q.id),
        );
        const matchByPrompt = existingQuestions.find(
          (q) => q.prompt === question.prompt && !consumedIds.has(q.id),
        );
        const existing = matchByOrder ?? matchByPrompt;

        if (existing) {
          // Mark as consumed so no other new question can match it
          consumedIds.add(existing.id);
          // Update existing question (preserves ID so answers stay linked)
          await db.questionnaireQuestion.update({
            where: { id: existing.id },
            data: {
              prompt: question.prompt,
              helperText: question.helperText,
              type: question.type,
              options: question.options ?? undefined,
              isRequired: true,
              order: i,
              isActive: true,
              deletedAt: null, // Restore if previously soft-deleted
            },
          });
          activeQuestionIds.push(existing.id);
          updatedQuestions++;
        } else {
          // Create new question
          const created = await db.questionnaireQuestion.create({
            data: {
              sectionId,
              prompt: question.prompt,
              helperText: question.helperText,
              type: question.type,
              options: question.options ?? undefined,
              isRequired: true,
              order: i,
              isActive: true,
              mlWeight: 1.0,
              isDealbreaker: false,
            },
          });
          activeQuestionIds.push(created.id);
          createdQuestions++;
        }

        totalQuestions++;
      }
    }
  }

  // Soft-delete questions that are no longer in the markdown
  // (but preserve them and their answers in the database)
  const removedQuestions = await db.questionnaireQuestion.updateMany({
    where: {
      id: { notIn: activeQuestionIds },
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  });

  // Soft-delete sections that are no longer in the markdown
  const removedSections = await db.questionnaireSection.updateMany({
    where: {
      id: { notIn: activeSectionIds },
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
      isActive: false,
    },
  });

  // Soft-delete pages that are no longer in the markdown
  const removedPages = await db.questionnairePage.updateMany({
    where: {
      id: { notIn: activePageIds },
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  if (
    removedQuestions.count > 0 ||
    removedSections.count > 0 ||
    removedPages.count > 0
  ) {
    console.log(
      `\n🗑️  Soft-deleted: ${removedPages.count} pages, ${removedSections.count} sections, ${removedQuestions.count} questions`,
    );
  }

  return {
    totalSections,
    totalQuestions,
    updatedPages,
    createdPages,
    updatedSections,
    createdSections,
    updatedQuestions,
    createdQuestions,
  };
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log("🌱 Starting questionnaire seed from markdown...\n");

  // Check environment
  const environment = process.env["NODE_ENV"] ?? "development";
  if (environment === "production") {
    console.log(
      "⚠️  Warning: Running in production. Make sure this is intentional.",
    );
  }

  // Read the markdown file
  const markdownPath = path.join(
    __dirname,
    "..",
    "docs",
    "finalDraftQuestions.md",
  );

  if (!fs.existsSync(markdownPath)) {
    console.error(`❌ Markdown file not found: ${markdownPath}`);
    process.exit(1);
  }

  const markdownContent = fs.readFileSync(markdownPath, "utf-8");
  console.log(`📖 Read markdown file: ${markdownPath}`);

  // Parse the markdown
  const pages = parseMarkdown(markdownContent);
  console.log(`✓ Parsed ${pages.length} pages from markdown`);

  // Upsert pages, sections, and questions (preserves existing answers)
  const result = await upsertPages(pages);

  // Summary
  console.log("\n✅ Seed completed successfully!\n");
  console.log("📊 Summary:");
  console.log(
    `   Pages: ${pages.length} (${result.createdPages} new, ${result.updatedPages} updated)`,
  );
  console.log(
    `   Sections: ${result.totalSections} (${result.createdSections} new, ${result.updatedSections} updated)`,
  );
  console.log(
    `   Questions: ${result.totalQuestions} (${result.createdQuestions} new, ${result.updatedQuestions} updated)`,
  );

  // Verify the data
  const verifyPages = await db.questionnairePage.count({
    where: { deletedAt: null },
  });
  const verifySections = await db.questionnaireSection.count({
    where: { deletedAt: null },
  });
  const verifyQuestions = await db.questionnaireQuestion.count({
    where: { deletedAt: null },
  });
  const verifyAnswers = await db.questionnaireAnswer.count();

  console.log("\n🔍 Verification:");
  console.log(`   Active pages in DB: ${verifyPages}`);
  console.log(`   Active sections in DB: ${verifySections}`);
  console.log(`   Active questions in DB: ${verifyQuestions}`);
  console.log(`   Answers preserved: ${verifyAnswers}`);

  if (
    verifyPages === pages.length &&
    verifySections === result.totalSections &&
    verifyQuestions === result.totalQuestions
  ) {
    console.log("\n✓ All data verified successfully!");
  } else {
    console.log("\n⚠️  Verification mismatch - please check the data");
  }

  console.log('\n🚀 Next: Run "npm run db:studio" to view your data\n');

  await db.$disconnect();
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
