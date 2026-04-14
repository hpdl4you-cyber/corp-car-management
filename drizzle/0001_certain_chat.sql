ALTER TABLE "reservations" ADD COLUMN "checkin_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "checkout_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "return_location" text;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "checkin_token" text;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "checkout_token" text;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "notification_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "vehicles" ADD COLUMN "last_return_location" text DEFAULT '창원본사';--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_checkin_token_unique" UNIQUE("checkin_token");--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_checkout_token_unique" UNIQUE("checkout_token");