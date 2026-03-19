-- Make primaryItemId and description optional for DRAFT save support
ALTER TABLE "change_events" ALTER COLUMN "primaryItemId" DROP NOT NULL;
ALTER TABLE "change_events" ALTER COLUMN "description" DROP NOT NULL;
