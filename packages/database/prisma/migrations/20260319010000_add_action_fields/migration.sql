-- AlterTable
ALTER TABLE "change_events" ADD COLUMN IF NOT EXISTS "actionDate" TIMESTAMP(3);
ALTER TABLE "change_events" ADD COLUMN IF NOT EXISTS "actionPlan" TEXT;
ALTER TABLE "change_events" ADD COLUMN IF NOT EXISTS "actionResult" TEXT;
ALTER TABLE "change_events" ADD COLUMN IF NOT EXISTS "qualityVerification" TEXT;
