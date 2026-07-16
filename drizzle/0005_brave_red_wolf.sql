CREATE TABLE "credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"holder_type" text NOT NULL,
	"holder_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"qr_token" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credentials_qr_token_unique" UNIQUE("qr_token"),
	CONSTRAINT "credentials_holder_type_holder_id_event_id_unique" UNIQUE("holder_type","holder_id","event_id")
);
--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;