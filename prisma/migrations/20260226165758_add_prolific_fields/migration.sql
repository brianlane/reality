-- AlterTable
ALTER TABLE "Applicant" ADD COLUMN "prolificPid" TEXT,
ADD COLUMN "prolificStudyId" TEXT,
ADD COLUMN "prolificSessionId" TEXT,
ADD COLUMN "prolificPartnerPid" TEXT,
ADD COLUMN "prolificCompletionCode" TEXT,
ADD COLUMN "prolificRedirectedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_prolificPid_key" ON "Applicant"("prolificPid");

-- CreateIndex
CREATE INDEX "Applicant_prolificStudyId_idx" ON "Applicant"("prolificStudyId");

-- CreateIndex
CREATE INDEX "Applicant_prolificSessionId_idx" ON "Applicant"("prolificSessionId");

-- CreateIndex
CREATE INDEX "Applicant_prolificCompletionCode_idx" ON "Applicant"("prolificCompletionCode");

-- CreateIndex
CREATE INDEX "Applicant_prolificPartnerPid_idx" ON "Applicant"("prolificPartnerPid");
