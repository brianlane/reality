-- Create questionnaire pages table
CREATE TABLE IF NOT EXISTS "QuestionnairePage" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "deletedBy" TEXT,

  CONSTRAINT "QuestionnairePage_pkey" PRIMARY KEY ("id")
);

-- Add pageId column to QuestionnaireSection
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'QuestionnaireSection'
      AND column_name = 'pageId'
  ) THEN
    ALTER TABLE "QuestionnaireSection" ADD COLUMN "pageId" TEXT;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "QuestionnairePage_order_idx" ON "QuestionnairePage"("order");
CREATE INDEX IF NOT EXISTS "QuestionnairePage_deletedAt_idx" ON "QuestionnairePage"("deletedAt");
CREATE INDEX IF NOT EXISTS "QuestionnaireSection_pageId_idx" ON "QuestionnaireSection"("pageId");

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.conname = 'QuestionnaireSection_pageId_fkey'
      AND t.relname = 'QuestionnaireSection'
  ) THEN
    ALTER TABLE "QuestionnaireSection"
      ADD CONSTRAINT "QuestionnaireSection_pageId_fkey"
      FOREIGN KEY ("pageId") REFERENCES "QuestionnairePage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Create default "Main Questionnaire" page
DO $$
DECLARE
  default_page_id TEXT;
BEGIN
  -- Generate a unique ID for the default page
  default_page_id := 'clpage' || substring(md5(random()::text) from 1 for 20);

  -- Insert default page if no pages exist
  IF NOT EXISTS (SELECT 1 FROM "QuestionnairePage") THEN
    INSERT INTO "QuestionnairePage" ("id", "title", "description", "order", "createdAt", "updatedAt")
    VALUES (
      default_page_id,
      'Main Questionnaire',
      'Default questionnaire page for all existing sections',
      0,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );

    -- Assign all existing active sections without a pageId to the default page
    UPDATE "QuestionnaireSection"
    SET "pageId" = default_page_id, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "pageId" IS NULL
      AND "isActive" = true
      AND "deletedAt" IS NULL;
  END IF;
END $$;
