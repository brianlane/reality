-- Add waitlist invited status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'WAITLIST_INVITED'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ApplicationStatus')
  ) THEN
    ALTER TYPE "ApplicationStatus" ADD VALUE 'WAITLIST_INVITED';
  END IF;
END $$;

-- Create questionnaire question type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'QuestionnaireQuestionType'
  ) THEN
    CREATE TYPE "QuestionnaireQuestionType" AS ENUM (
      'TEXT',
      'TEXTAREA',
      'RICH_TEXT',
      'DROPDOWN',
      'RADIO_7',
      'CHECKBOXES',
      'NUMBER_SCALE'
    );
  END IF;
END $$;

-- Create questionnaire sections table
CREATE TABLE IF NOT EXISTS "QuestionnaireSection" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "deletedBy" TEXT,

  CONSTRAINT "QuestionnaireSection_pkey" PRIMARY KEY ("id")
);

-- Create questionnaire questions table
CREATE TABLE IF NOT EXISTS "QuestionnaireQuestion" (
  "id" TEXT NOT NULL,
  "sectionId" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "helperText" TEXT,
  "type" "QuestionnaireQuestionType" NOT NULL,
  "options" JSONB,
  "isRequired" BOOLEAN NOT NULL DEFAULT false,
  "order" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "deletedBy" TEXT,

  CONSTRAINT "QuestionnaireQuestion_pkey" PRIMARY KEY ("id")
);

-- Create questionnaire answers table
CREATE TABLE IF NOT EXISTS "QuestionnaireAnswer" (
  "id" TEXT NOT NULL,
  "applicantId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "value" JSONB,
  "richText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "QuestionnaireAnswer_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "QuestionnaireSection_order_idx" ON "QuestionnaireSection"("order");
CREATE INDEX IF NOT EXISTS "QuestionnaireSection_isActive_idx" ON "QuestionnaireSection"("isActive");
CREATE INDEX IF NOT EXISTS "QuestionnaireSection_deletedAt_idx" ON "QuestionnaireSection"("deletedAt");

CREATE INDEX IF NOT EXISTS "QuestionnaireQuestion_sectionId_idx" ON "QuestionnaireQuestion"("sectionId");
CREATE INDEX IF NOT EXISTS "QuestionnaireQuestion_type_idx" ON "QuestionnaireQuestion"("type");
CREATE INDEX IF NOT EXISTS "QuestionnaireQuestion_order_idx" ON "QuestionnaireQuestion"("order");
CREATE INDEX IF NOT EXISTS "QuestionnaireQuestion_isActive_idx" ON "QuestionnaireQuestion"("isActive");
CREATE INDEX IF NOT EXISTS "QuestionnaireQuestion_deletedAt_idx" ON "QuestionnaireQuestion"("deletedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "QuestionnaireAnswer_applicantId_questionId_key" ON "QuestionnaireAnswer"("applicantId", "questionId");
CREATE INDEX IF NOT EXISTS "QuestionnaireAnswer_applicantId_idx" ON "QuestionnaireAnswer"("applicantId");
CREATE INDEX IF NOT EXISTS "QuestionnaireAnswer_questionId_idx" ON "QuestionnaireAnswer"("questionId");

-- Foreign keys (using DO blocks to add conditionally)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'QuestionnaireQuestion_sectionId_fkey'
  ) THEN
    ALTER TABLE "QuestionnaireQuestion"
      ADD CONSTRAINT "QuestionnaireQuestion_sectionId_fkey"
      FOREIGN KEY ("sectionId") REFERENCES "QuestionnaireSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'QuestionnaireAnswer_applicantId_fkey'
  ) THEN
    ALTER TABLE "QuestionnaireAnswer"
      ADD CONSTRAINT "QuestionnaireAnswer_applicantId_fkey"
      FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'QuestionnaireAnswer_questionId_fkey'
  ) THEN
    ALTER TABLE "QuestionnaireAnswer"
      ADD CONSTRAINT "QuestionnaireAnswer_questionId_fkey"
      FOREIGN KEY ("questionId") REFERENCES "QuestionnaireQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
