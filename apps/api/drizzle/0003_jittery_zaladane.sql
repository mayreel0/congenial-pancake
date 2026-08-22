CREATE TYPE "public"."answer_interaction_status" AS ENUM('skipped', 'held');--> statement-breakpoint
CREATE TABLE "answer_interactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"author_id" uuid,
	"guest_id" text,
	"status" "answer_interaction_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "answer_interactions_request_author_unique" UNIQUE("request_id","author_id"),
	CONSTRAINT "answer_interactions_request_guest_unique" UNIQUE("request_id","guest_id"),
	CONSTRAINT "answer_interactions_author_or_guest" CHECK ("answer_interactions"."author_id" is not null or "answer_interactions"."guest_id" is not null),
	CONSTRAINT "answer_interactions_guest_skip_only" CHECK ("answer_interactions"."guest_id" is null or "answer_interactions"."status" = 'skipped')
);
--> statement-breakpoint
ALTER TABLE "answer_interactions" ADD CONSTRAINT "answer_interactions_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "answer_interactions" ADD CONSTRAINT "answer_interactions_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;