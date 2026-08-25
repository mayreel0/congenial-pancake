ALTER TABLE "requests" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "replies" ADD COLUMN "reviewed_at" timestamp with time zone;