ALTER TABLE "event_fee_rules" DROP CONSTRAINT "event_fee_rules_event_id_payer_type_day_unique";
ALTER TABLE "event_fee_rules" DROP COLUMN "day";
ALTER TABLE "event_fee_rules" ADD CONSTRAINT "event_fee_rules_event_id_payer_type_unique" UNIQUE("event_id","payer_type");
ALTER TABLE "activities" DROP COLUMN "kind";
ALTER TABLE "activities" ADD COLUMN "price" integer DEFAULT 0 NOT NULL;
