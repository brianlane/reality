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

-- Soft delete columns
ALTER TABLE "User"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedBy" TEXT;

ALTER TABLE "Applicant"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedBy" TEXT,
  ADD COLUMN "stage1CompletedAt" TIMESTAMP(3),
  ADD COLUMN "stage1Responses" JSONB,
  ADD COLUMN "waitlistedAt" TIMESTAMP(3),
  ADD COLUMN "waitlistReason" TEXT,
  ADD COLUMN "waitlistPosition" INTEGER,
  ADD COLUMN "invitedOffWaitlistAt" TIMESTAMP(3),
  ADD COLUMN "invitedOffWaitlistBy" TEXT,
  ADD COLUMN "waitlistInviteToken" TEXT;

ALTER TABLE "Payment"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedBy" TEXT;

ALTER TABLE "Event"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedBy" TEXT;

ALTER TABLE "Match"
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ADD COLUMN "deletedBy" TEXT;

-- Soft delete indexes
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
CREATE INDEX "Applicant_deletedAt_idx" ON "Applicant"("deletedAt");
CREATE UNIQUE INDEX "Applicant_waitlistInviteToken_key" ON "Applicant"("waitlistInviteToken");
CREATE INDEX "Payment_deletedAt_idx" ON "Payment"("deletedAt");
CREATE INDEX "Event_deletedAt_idx" ON "Event"("deletedAt");
CREATE INDEX "Match_deletedAt_idx" ON "Match"("deletedAt");
