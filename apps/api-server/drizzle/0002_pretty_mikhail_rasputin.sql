ALTER TABLE "requests" ALTER COLUMN "author_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "replies" ALTER COLUMN "author_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "guest_id" text;--> statement-breakpoint
ALTER TABLE "replies" ADD COLUMN "guest_id" text;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_guest_id_unique" UNIQUE("guest_id");--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_author_or_guest" CHECK ("requests"."author_id" is not null or "requests"."guest_id" is not null);--> statement-breakpoint
ALTER TABLE "replies" ADD CONSTRAINT "replies_author_or_guest" CHECK ("replies"."author_id" is not null or "replies"."guest_id" is not null);