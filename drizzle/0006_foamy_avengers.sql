CREATE TABLE "host_sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"host_student_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "host_students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"roll_number" text NOT NULL,
	"cnic" text NOT NULL,
	"name" text NOT NULL,
	"class_name" text,
	"participant_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "host_students_roll_number_unique" UNIQUE("roll_number")
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "event_id" uuid;--> statement-breakpoint
ALTER TABLE "host_sessions" ADD CONSTRAINT "host_sessions_host_student_id_host_students_id_fk" FOREIGN KEY ("host_student_id") REFERENCES "public"."host_students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "host_students" ADD CONSTRAINT "host_students_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;