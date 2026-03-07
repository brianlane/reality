-- AlterTable: add FCRA consent tracking and Checkr integration ID fields to Applicant
ALTER TABLE "Applicant" ADD COLUMN     "backgroundCheckConsentAt" TIMESTAMP(3),
ADD COLUMN     "backgroundCheckConsentIp" TEXT,
ADD COLUMN     "checkrCandidateId" TEXT,
ADD COLUMN     "continuousMonitoringId" TEXT;

-- CreateIndex: unique constraints for Checkr integration IDs
CREATE UNIQUE INDEX "Applicant_checkrCandidateId_key" ON "Applicant"("checkrCandidateId");
CREATE UNIQUE INDEX "Applicant_continuousMonitoringId_key" ON "Applicant"("continuousMonitoringId");

-- CreateTable: ScreeningAuditLog for FCRA compliance
CREATE TABLE "ScreeningAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "applicantId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreeningAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: indexes for audit log queries
CREATE INDEX "ScreeningAuditLog_applicantId_idx" ON "ScreeningAuditLog"("applicantId");
CREATE INDEX "ScreeningAuditLog_userId_idx" ON "ScreeningAuditLog"("userId");
CREATE INDEX "ScreeningAuditLog_createdAt_idx" ON "ScreeningAuditLog"("createdAt");

-- AddForeignKey: User -> ScreeningAuditLog (SetNull on delete for FCRA retention)
ALTER TABLE "ScreeningAuditLog" ADD CONSTRAINT "ScreeningAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Applicant -> ScreeningAuditLog (SetNull on delete for FCRA retention)
ALTER TABLE "ScreeningAuditLog" ADD CONSTRAINT "ScreeningAuditLog_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
