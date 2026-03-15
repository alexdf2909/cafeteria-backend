ALTER TABLE "unit" ALTER COLUMN "unit_type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "unit" ADD COLUMN "is_base" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "unit" ADD CONSTRAINT "unit_symbol_unique" UNIQUE("symbol");