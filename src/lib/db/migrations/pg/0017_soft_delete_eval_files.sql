ALTER TABLE "eval_files" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;
ALTER TABLE "eval_files" ADD COLUMN "deleted_at" timestamp;
