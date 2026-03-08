CREATE TABLE "todo_relationships" (
	"parent_id" integer NOT NULL,
	"child_id" integer NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "todo_relationships_parent_id_child_id_pk" PRIMARY KEY("parent_id","child_id")
);
--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "images" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "files" jsonb DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "todos" ADD COLUMN "is_pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "todo_relationships" ADD CONSTRAINT "todo_relationships_parent_id_todos_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."todos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "todo_relationships" ADD CONSTRAINT "todo_relationships_child_id_todos_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."todos"("id") ON DELETE cascade ON UPDATE no action;