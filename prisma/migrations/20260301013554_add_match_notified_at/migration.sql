-- AlterEnum
ALTER TYPE "AdminActionType" ADD VALUE 'NOTIFY_MATCHES';

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "notifiedAt" TIMESTAMP(3);
