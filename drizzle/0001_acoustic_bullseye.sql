CREATE TYPE "public"."item_status" AS ENUM('active', 'inactive', 'archived');--> statement-breakpoint
ALTER TABLE "item" ADD COLUMN "status" "item_status" DEFAULT 'active' NOT NULL;