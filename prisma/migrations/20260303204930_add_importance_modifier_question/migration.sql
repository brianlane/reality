-- AlterTable
ALTER TABLE "QuestionnaireQuestion" ADD COLUMN     "importanceModifierForId" TEXT;

-- AddForeignKey
ALTER TABLE "QuestionnaireQuestion" ADD CONSTRAINT "QuestionnaireQuestion_importanceModifierForId_fkey" FOREIGN KEY ("importanceModifierForId") REFERENCES "QuestionnaireQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
