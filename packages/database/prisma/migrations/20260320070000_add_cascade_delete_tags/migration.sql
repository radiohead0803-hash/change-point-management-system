-- Add cascade delete to ChangeEventTag when ChangeEvent is deleted
ALTER TABLE "change_event_tags" DROP CONSTRAINT IF EXISTS "change_event_tags_eventId_fkey";
ALTER TABLE "change_event_tags" ADD CONSTRAINT "change_event_tags_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "change_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
