CREATE UNIQUE INDEX "unit_name_unit_type_unique" ON "unit" USING btree ("name","unit_type");--> statement-breakpoint
CREATE INDEX "unit_unit_type_index" ON "unit" USING btree ("unit_type");