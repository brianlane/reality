-- Add new admin action types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'INVITE_OFF_WAITLIST'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AdminActionType')
  ) THEN
    ALTER TYPE "AdminActionType" ADD VALUE 'INVITE_OFF_WAITLIST';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'BATCH_INVITE_WAITLIST'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'AdminActionType')
  ) THEN
    ALTER TYPE "AdminActionType" ADD VALUE 'BATCH_INVITE_WAITLIST';
  END IF;
END $$;

-- Soft delete columns (using IF NOT EXISTS to handle already existing columns)
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;

ALTER TABLE "Applicant"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "stage1CompletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "stage1Responses" JSONB,
  ADD COLUMN IF NOT EXISTS "waitlistedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "waitlistReason" TEXT,
  ADD COLUMN IF NOT EXISTS "waitlistPosition" INTEGER,
  ADD COLUMN IF NOT EXISTS "invitedOffWaitlistAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "invitedOffWaitlistBy" TEXT,
  ADD COLUMN IF NOT EXISTS "waitlistInviteToken" TEXT;

ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;

ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;

ALTER TABLE "Match"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deletedBy" TEXT;

-- Soft delete indexes (using IF NOT EXISTS to handle already existing indexes)
CREATE INDEX IF NOT EXISTS "User_deletedAt_idx" ON "User"("deletedAt");
CREATE INDEX IF NOT EXISTS "Applicant_deletedAt_idx" ON "Applicant"("deletedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "Applicant_waitlistInviteToken_key" ON "Applicant"("waitlistInviteToken");
CREATE INDEX IF NOT EXISTS "Payment_deletedAt_idx" ON "Payment"("deletedAt");
CREATE INDEX IF NOT EXISTS "Event_deletedAt_idx" ON "Event"("deletedAt");
CREATE INDEX IF NOT EXISTS "Match_deletedAt_idx" ON "Match"("deletedAt");
