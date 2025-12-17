CREATE TABLE IF NOT EXISTS "eval_files" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL,
        "title" varchar(255) NOT NULL,
        "description" text,
        "status" varchar(50) DEFAULT 'pending' NOT NULL,
        "file_name" varchar(255) NOT NULL,
        "file_type" varchar(255) NOT NULL,
        "file_size" bigint NOT NULL,
        "storage_key" varchar(512) NOT NULL,
        "file_url" varchar(1024) NOT NULL,
        "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eval_files" ADD CONSTRAINT "eval_files_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
