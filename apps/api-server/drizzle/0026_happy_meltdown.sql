ALTER TABLE "requests" ADD COLUMN "content_removed_at" timestamp with time zone;
--> statement-breakpoint
-- Requests the author already removed before this column existed have no
-- removal time on record — start their 30-day retention clock at deploy
-- rather than leaving them un-purgeable.
UPDATE "requests" SET "content_removed_at" = now() WHERE "content_removed" = true AND "content_removed_at" IS NULL;
