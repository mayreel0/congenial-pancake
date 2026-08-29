ALTER TABLE "users" ADD COLUMN "show_requests_on_profile" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "show_replies_on_profile" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "show_counts_on_profile" boolean DEFAULT true NOT NULL;