CREATE TYPE "public"."reply_moderation_action" AS ENUM('allow', 'suggest_rewrite', 'block', 'uncertain');--> statement-breakpoint
CREATE TYPE "public"."reply_moderation_excluded_reason" AS ENUM('load_test', 'seed_data', 'system_generated');--> statement-breakpoint
CREATE TABLE "reply_moderation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reply_id" uuid NOT NULL,
	"action" "reply_moderation_action" NOT NULL,
	"categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"severity" integer NOT NULL,
	"confidence" real NOT NULL,
	"reason" text NOT NULL,
	"suggestions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error_reason" text,
	"should_persist_for_training" boolean DEFAULT true NOT NULL,
	"excluded_reason" "reply_moderation_excluded_reason",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reply_moderation_logs" ADD CONSTRAINT "reply_moderation_logs_reply_id_replies_id_fk" FOREIGN KEY ("reply_id") REFERENCES "public"."replies"("id") ON DELETE no action ON UPDATE no action;