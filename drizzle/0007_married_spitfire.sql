CREATE TABLE "expiration_alert" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "expiration_alert_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"lot_id" integer NOT NULL,
	"alert_date" timestamp NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "restock_alert" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "restock_alert_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"item_id" integer NOT NULL,
	"alert_date" timestamp NOT NULL,
	"resolved_at" timestamp,
	"purchase_id" integer,
	"stock_at_alert" numeric(12, 4) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "promotion" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "promotion_condition" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "promotion_reward" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "sale_promotion" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "promotion" CASCADE;--> statement-breakpoint
DROP TABLE "promotion_condition" CASCADE;--> statement-breakpoint
DROP TABLE "promotion_reward" CASCADE;--> statement-breakpoint
DROP TABLE "sale_promotion" CASCADE;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'empleado'::text;--> statement-breakpoint
DROP TYPE "public"."role";--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('empleado', 'admin');--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'empleado'::"public"."role";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DATA TYPE "public"."role" USING "role"::"public"."role";--> statement-breakpoint
DROP INDEX "idx_sale_date_status";--> statement-breakpoint
ALTER TABLE "inventory_lot" ALTER COLUMN "expiration_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "item_supplier" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "sale" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "supplier" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "expiration_alert" ADD CONSTRAINT "expiration_alert_lot_id_inventory_lot_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."inventory_lot"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expiration_alert" ADD CONSTRAINT "expiration_alert_resolved_by_user_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restock_alert" ADD CONSTRAINT "restock_alert_item_id_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "restock_alert" ADD CONSTRAINT "restock_alert_purchase_id_purchase_id_fk" FOREIGN KEY ("purchase_id") REFERENCES "public"."purchase"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_expiration_alert_lot_resolved" ON "expiration_alert" USING btree ("lot_id","resolved_at");--> statement-breakpoint
CREATE INDEX "idx_restock_alert_item_resolved" ON "restock_alert" USING btree ("item_id","resolved_at");--> statement-breakpoint
CREATE INDEX "idx_sale_date" ON "sale" USING btree ("sale_date");--> statement-breakpoint
ALTER TABLE "inventory_count" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "purchase" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "sale" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "sale" DROP COLUMN "subtotal_amount";--> statement-breakpoint
ALTER TABLE "sale" DROP COLUMN "discount_total";--> statement-breakpoint
ALTER TABLE "sale" DROP COLUMN "tax_amount";--> statement-breakpoint
ALTER TABLE "sale_product" DROP COLUMN "discount_amount";--> statement-breakpoint
ALTER TABLE "sale_recipe_optional" DROP COLUMN "discount_amount";--> statement-breakpoint
ALTER TABLE "supplier" ADD CONSTRAINT "supplier_email_unique" UNIQUE("email");--> statement-breakpoint
DROP TYPE "public"."promotion_type";--> statement-breakpoint
DROP TYPE "public"."reward_type";--> statement-breakpoint
DROP TYPE "public"."status";