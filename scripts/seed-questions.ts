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

async function clearExistingData() {
  console.log("🗑️  Clearing existing questionnaire data...");

  // Delete in order due to foreign key constraints
  await db.questionnaireAnswer.deleteMany();
  await db.questionnaireQuestion.deleteMany();
  await db.questionnaireSection.deleteMany();
  await db.questionnairePage.deleteMany();

  console.log("✓ Cleared existing data");
}

async function seedPages(pages: ParsedPage[], forResearch: boolean) {
  const modeLabel = forResearch ? "research" : "application";
  console.log(`\n📄 Seeding ${pages.length} ${modeLabel} pages...`);

  let totalSections = 0;
  let totalQuestions = 0;

  for (const page of pages) {
    // Create the page
    const createdPage = await db.questionnairePage.create({
      data: {
        title: page.title,
        order: page.order,
        forResearch,
      },
    });

    console.log(`  ✓ Page ${page.order + 1}: ${page.title} (${modeLabel})`);

    // Create sections for this page
    for (const section of page.sections) {
      const createdSection = await db.questionnaireSection.create({
        data: {
          title: section.title,
          order: section.order,
          pageId: createdPage.id,
          isActive: true,
          forResearch,
        },
      });

      totalSections++;

      // Create questions for this section
      for (let i = 0; i < section.questions.length; i++) {
        const question = section.questions[i];

        await db.questionnaireQuestion.create({
          data: {
            sectionId: createdSection.id,
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

        totalQuestions++;
      }
    }
  }

  return { totalSections, totalQuestions };
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

  // Clear existing data
  await clearExistingData();

  // Seed the database - application mode
  const appResult = await seedPages(pages, false);

  // Seed the database - research mode (same questions, flagged for research)
  const researchResult = await seedPages(pages, true);

  const totalPages = pages.length * 2;
  const totalSections = appResult.totalSections + researchResult.totalSections;
  const totalQuestions =
    appResult.totalQuestions + researchResult.totalQuestions;

  // Summary
  console.log("\n✅ Seed completed successfully!\n");
  console.log("📊 Summary:");
  console.log(`   Application pages: ${pages.length}`);
  console.log(`   Research pages: ${pages.length}`);
  console.log(`   Total pages: ${totalPages}`);
  console.log(`   Total sections: ${totalSections}`);
  console.log(`   Total questions: ${totalQuestions}`);

  // Verify the data
  const verifyPages = await db.questionnairePage.count();
  const verifySections = await db.questionnaireSection.count();
  const verifyQuestions = await db.questionnaireQuestion.count();

  console.log("\n🔍 Verification:");
  console.log(`   Pages in DB: ${verifyPages}`);
  console.log(`   Sections in DB: ${verifySections}`);
  console.log(`   Questions in DB: ${verifyQuestions}`);

  if (
    verifyPages === totalPages &&
    verifySections === totalSections &&
    verifyQuestions === totalQuestions
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
