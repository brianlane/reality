-- CreateEnum
CREATE TYPE "FlagSeverity" AS ENUM ('GREEN', 'YELLOW', 'RED');

-- AlterTable
ALTER TABLE "Applicant" ADD COLUMN     "relationshipReadinessFlag" "FlagSeverity",
ADD COLUMN     "saScreeningFlag" "FlagSeverity",
ADD COLUMN     "screeningFlagComputedAt" TIMESTAMP(3),
ADD COLUMN     "screeningFlagDetails" JSONB,
ADD COLUMN     "screeningFlagOverride" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "screeningFlagReviewedAt" TIMESTAMP(3),
ADD COLUMN     "screeningFlagReviewedBy" TEXT;

-- CreateIndex
CREATE INDEX "Applicant_relationshipReadinessFlag_idx" ON "Applicant"("relationshipReadinessFlag");

-- CreateIndex
CREATE INDEX "Applicant_saScreeningFlag_idx" ON "Applicant"("saScreeningFlag");
