-- Add new demographics fields and soft rejection tracking
ALTER TABLE "Applicant"
  ADD COLUMN IF NOT EXISTS "cityFrom" TEXT,
  ADD COLUMN IF NOT EXISTS "industry" TEXT,
  ADD COLUMN IF NOT EXISTS "referredBy" TEXT,
  ADD COLUMN IF NOT EXISTS "aboutYourself" TEXT,
  ADD COLUMN IF NOT EXISTS "softRejectedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "softRejectedFromStatus" "ApplicationStatus";
