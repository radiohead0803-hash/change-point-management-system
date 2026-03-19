-- Create NotificationType enum if not exists
DO $$ BEGIN
    CREATE TYPE "NotificationType" AS ENUM ('APPROVAL_REQUEST', 'APPROVED', 'REVIEW_RETURNED', 'SUBMITTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "eventId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- Create index
CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");
