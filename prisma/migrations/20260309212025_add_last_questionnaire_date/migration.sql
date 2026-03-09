-- DropIndex
DROP INDEX "ScreeningAuditLog_metadata_gin";

-- AlterTable
ALTER TABLE "Applicant" ADD COLUMN     "lastQuestionnaireDate" TIMESTAMP(3);
