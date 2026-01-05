ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "tenant_id" text DEFAULT 'default' NOT NULL;
