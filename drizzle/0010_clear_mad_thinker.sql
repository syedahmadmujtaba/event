CREATE INDEX "activities_event_id_idx" ON "activities" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "credentials_event_id_idx" ON "credentials" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "credentials_holder_id_idx" ON "credentials" USING btree ("holder_id");--> statement-breakpoint
CREATE INDEX "delegation_registrations_coordinator_user_id_idx" ON "delegation_registrations" USING btree ("coordinator_user_id");--> statement-breakpoint
CREATE INDEX "delegation_registrations_school_id_idx" ON "delegation_registrations" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "delegation_registrations_event_id_idx" ON "delegation_registrations" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_fee_rules_event_id_idx" ON "event_fee_rules" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "matches_activity_id_idx" ON "matches" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "payments_payer_id_idx" ON "payments" USING btree ("payer_id");--> statement-breakpoint
CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "registrations_participant_id_idx" ON "registrations" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "registrations_activity_id_idx" ON "registrations" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "team_members_team_id_idx" ON "team_members" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "teams_activity_id_idx" ON "teams" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "teams_school_id_idx" ON "teams" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "user_roles_user_id_idx" ON "user_roles" USING btree ("user_id");