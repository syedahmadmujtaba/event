CREATE TABLE "event_fee_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"payer_type" text NOT NULL,
	"amount" integer NOT NULL,
	"day" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_fee_rules_event_id_payer_type_day_unique" UNIQUE("event_id","payer_type","day")
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "max_activities_per_participant" integer;--> statement-breakpoint
ALTER TABLE "event_fee_rules" ADD CONSTRAINT "event_fee_rules_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;