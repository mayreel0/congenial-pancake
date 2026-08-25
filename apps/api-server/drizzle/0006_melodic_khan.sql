CREATE TABLE "settings" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"queue_freshness_hours" integer DEFAULT 60 NOT NULL,
	"queue_reply_cap" integer DEFAULT 5 NOT NULL,
	"guest_reply_limit" integer DEFAULT 5 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settings_single_row" CHECK ("settings"."id" = 1)
);
