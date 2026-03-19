-- Add productName to change_events
ALTER TABLE "change_events" ADD COLUMN IF NOT EXISTS "productName" TEXT;

-- Add data column to attachments for base64 storage
ALTER TABLE "attachments" ADD COLUMN IF NOT EXISTS "data" TEXT;

-- Make path optional in attachments
ALTER TABLE "attachments" ALTER COLUMN "path" DROP NOT NULL;
