ALTER TABLE "requests" ADD COLUMN "anonymous" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "replies" ADD COLUMN "anonymous" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_guest_must_be_anonymous" CHECK ("requests"."author_id" is not null or "requests"."anonymous" = true);--> statement-breakpoint
ALTER TABLE "replies" ADD CONSTRAINT "replies_guest_must_be_anonymous" CHECK ("replies"."author_id" is not null or "replies"."anonymous" = true);