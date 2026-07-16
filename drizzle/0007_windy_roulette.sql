CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"side_a_type" text NOT NULL,
	"side_a_id" uuid NOT NULL,
	"side_b_type" text NOT NULL,
	"side_b_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone,
	"venue" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"result" text,
	"winner_side" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visitor_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visitor_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visitor_tickets_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "visitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"cnic" text NOT NULL,
	"phone" text,
	"association" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_activity_id_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_tickets" ADD CONSTRAINT "visitor_tickets_visitor_id_visitors_id_fk" FOREIGN KEY ("visitor_id") REFERENCES "public"."visitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_tickets" ADD CONSTRAINT "visitor_tickets_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;