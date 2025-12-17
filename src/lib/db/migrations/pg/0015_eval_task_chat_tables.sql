CREATE TABLE IF NOT EXISTS "eval_task_chat_thread" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eval_task_chat_thread" ADD CONSTRAINT "eval_task_chat_thread_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "eval_task_chat_message" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_id" uuid NOT NULL,
	"role" text NOT NULL,
	"parts" json[] NOT NULL,
	"metadata" json,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "eval_task_chat_message" ADD CONSTRAINT "eval_task_chat_message_thread_id_eval_task_chat_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "eval_task_chat_thread"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
