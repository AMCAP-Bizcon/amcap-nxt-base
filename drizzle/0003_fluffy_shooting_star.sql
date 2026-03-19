CREATE TABLE "todo_media" (
	"id" serial PRIMARY KEY NOT NULL,
	"todo_id" integer NOT NULL,
	"media_type" text NOT NULL,
	"url" text NOT NULL,
	"path" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "todo_media" ADD CONSTRAINT "todo_media_todo_id_todos_id_fk" FOREIGN KEY ("todo_id") REFERENCES "public"."todos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todo_relationships" DROP COLUMN "user_id";--> statement-breakpoint
ALTER TABLE "todos" DROP COLUMN "images";--> statement-breakpoint
ALTER TABLE "todos" DROP COLUMN "files";