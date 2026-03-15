CREATE TABLE "recipe" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "recipe_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"product_presentation_id" integer NOT NULL,
	"version" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipe_item" DROP CONSTRAINT "recipe_item_product_presentation_id_product_presentation_id_fk";
--> statement-breakpoint
ALTER TABLE "sale_product" DROP CONSTRAINT "sale_product_product_presentation_id_product_presentation_id_fk";
--> statement-breakpoint
ALTER TABLE "recipe_item" ALTER COLUMN "optional_type" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe_item" ALTER COLUMN "extra_price" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe_item" ADD COLUMN "recipe_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_product" ADD COLUMN "recipe_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe" ADD CONSTRAINT "recipe_product_presentation_id_product_presentation_id_fk" FOREIGN KEY ("product_presentation_id") REFERENCES "public"."product_presentation"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_recipe_product_presentation" ON "recipe" USING btree ("product_presentation_id");--> statement-breakpoint
ALTER TABLE "recipe_item" ADD CONSTRAINT "recipe_item_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_product" ADD CONSTRAINT "sale_product_recipe_id_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipe"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sale_product_recipe" ON "sale_product" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "idx_sale_recipe_optional_sale_product" ON "sale_recipe_optional" USING btree ("sale_product_id");--> statement-breakpoint
CREATE INDEX "idx_sale_recipe_optional_recipe_item" ON "sale_recipe_optional" USING btree ("recipe_item_id");--> statement-breakpoint
ALTER TABLE "item" DROP COLUMN "image";--> statement-breakpoint
ALTER TABLE "item" DROP COLUMN "image_cld_pub_id";--> statement-breakpoint
ALTER TABLE "product" DROP COLUMN "image";--> statement-breakpoint
ALTER TABLE "product" DROP COLUMN "image_cld_pub_id";--> statement-breakpoint
ALTER TABLE "recipe_item" DROP COLUMN "product_presentation_id";--> statement-breakpoint
ALTER TABLE "sale_product" DROP COLUMN "product_presentation_id";