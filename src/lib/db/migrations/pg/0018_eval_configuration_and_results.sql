CREATE TABLE IF NOT EXISTS "eval_configuration" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "file_id" uuid NOT NULL,
        "columns" jsonb NOT NULL,
        "total_rows" integer NOT NULL,
        "input_column" varchar(255) DEFAULT 'input' NOT NULL,
        "expected_output_column" varchar(255),
        "actual_output_column" varchar(255),
        "preview_rows" jsonb,
        "raw_config" jsonb,
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eval_configuration" ADD CONSTRAINT "eval_configuration_file_id_eval_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "eval_files"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "eval_configuration_file_id_idx" ON "eval_configuration" ("file_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eval_result_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "file_id" uuid NOT NULL,
        "row_index" integer NOT NULL,
        "input" text NOT NULL,
        "expected_output" text,
        "actual_output" text,
        "success" boolean,
        "metrics" jsonb,
        "execution_time" double precision,
        "timestamp" timestamp,
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eval_result_items" ADD CONSTRAINT "eval_result_items_file_id_eval_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "eval_files"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "eval_result_items_file_row_idx" ON "eval_result_items" ("file_id","row_index");
