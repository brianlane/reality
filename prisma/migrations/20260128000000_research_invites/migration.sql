-- AlterEnum
ALTER TYPE "AdminActionType" ADD VALUE 'INVITE_RESEARCH';

-- AlterEnum
ALTER TYPE "ApplicationStatus" ADD VALUE 'RESEARCH_INVITED';
ALTER TYPE "ApplicationStatus" ADD VALUE 'RESEARCH_IN_PROGRESS';
ALTER TYPE "ApplicationStatus" ADD VALUE 'RESEARCH_COMPLETED';

-- AlterTable
ALTER TABLE "Applicant" ADD COLUMN     "researchCompletedAt" TIMESTAMP(3),
ADD COLUMN     "researchInviteCode" TEXT,
ADD COLUMN     "researchInviteUsedAt" TIMESTAMP(3),
ADD COLUMN     "researchInvitedAt" TIMESTAMP(3),
ADD COLUMN     "researchInvitedBy" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_researchInviteCode_key" ON "Applicant"("researchInviteCode");
