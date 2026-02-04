-- AlterTable - Add forResearch column to QuestionnairePage
ALTER TABLE "QuestionnairePage" ADD COLUMN "forResearch" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable - Add forResearch column to QuestionnaireSection
ALTER TABLE "QuestionnaireSection" ADD COLUMN "forResearch" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "QuestionnairePage_forResearch_idx" ON "QuestionnairePage"("forResearch");

-- CreateIndex
CREATE INDEX "QuestionnaireSection_forResearch_idx" ON "QuestionnaireSection"("forResearch");
