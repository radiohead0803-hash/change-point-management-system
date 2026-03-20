-- AlterTable
ALTER TABLE "change_events" ADD COLUMN "returnComment" TEXT;
ALTER TABLE "change_events" ADD COLUMN "returnedAt" TIMESTAMP(3);
ALTER TABLE "change_events" ADD COLUMN "returnedById" TEXT;
