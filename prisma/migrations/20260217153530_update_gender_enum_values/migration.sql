/*
  Warnings:

  - The values [MALE,FEMALE] on the enum `Gender` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('SENT', 'FAILED', 'BOUNCED', 'DELIVERED', 'OPENED', 'CLICKED');

-- AlterEnum
BEGIN;
CREATE TYPE "Gender_new" AS ENUM ('MAN', 'WOMAN', 'NON_BINARY', 'PREFER_NOT_TO_SAY');
ALTER TABLE "Applicant" ALTER COLUMN "gender" TYPE "Gender_new" USING ("gender"::text::"Gender_new");
ALTER TABLE "Applicant" ALTER COLUMN "seeking" TYPE "Gender_new" USING ("seeking"::text::"Gender_new");
ALTER TYPE "Gender" RENAME TO "Gender_old";
ALTER TYPE "Gender_new" RENAME TO "Gender";
DROP TYPE "public"."Gender_old";
COMMIT;

-- AlterTable
ALTER TABLE "QuestionnaireQuestion" ADD COLUMN     "isDealbreaker" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mlWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0;

-- CreateTable
CREATE TABLE "MatchAnalytics" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "dateAccepted" BOOLEAN,
    "dateCompleted" BOOLEAN,
    "dateCompletedAt" TIMESTAMP(3),
    "applicantRating" INTEGER,
    "applicantFeedback" TEXT,
    "partnerRating" INTEGER,
    "partnerFeedback" TEXT,
    "relationshipFormed" BOOLEAN NOT NULL DEFAULT false,
    "relationshipStatus" TEXT,
    "relationshipEndedAt" TIMESTAMP(3),
    "adminRating" INTEGER,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" TEXT NOT NULL,
    "resendId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "emailType" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'SENT',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failureReason" TEXT,
    "applicantId" TEXT,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchAnalytics_matchId_key" ON "MatchAnalytics"("matchId");

-- CreateIndex
CREATE INDEX "MatchAnalytics_matchId_idx" ON "MatchAnalytics"("matchId");

-- CreateIndex
CREATE INDEX "MatchAnalytics_dateAccepted_idx" ON "MatchAnalytics"("dateAccepted");

-- CreateIndex
CREATE INDEX "MatchAnalytics_relationshipFormed_idx" ON "MatchAnalytics"("relationshipFormed");

-- CreateIndex
CREATE INDEX "EmailLog_applicantId_idx" ON "EmailLog"("applicantId");

-- CreateIndex
CREATE INDEX "EmailLog_emailType_idx" ON "EmailLog"("emailType");

-- CreateIndex
CREATE INDEX "EmailLog_status_idx" ON "EmailLog"("status");

-- CreateIndex
CREATE INDEX "EmailLog_sentAt_idx" ON "EmailLog"("sentAt");

-- CreateIndex
CREATE INDEX "EmailLog_recipientEmail_idx" ON "EmailLog"("recipientEmail");

-- AddForeignKey
ALTER TABLE "MatchAnalytics" ADD CONSTRAINT "MatchAnalytics_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
