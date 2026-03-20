CREATE TABLE "access_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"app_name" varchar(50) NOT NULL,
	"can_read" boolean DEFAULT false NOT NULL,
	"can_create" boolean DEFAULT false NOT NULL,
	"can_update" boolean DEFAULT false NOT NULL,
	"can_delete" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "access_rules" ADD CONSTRAINT "access_rules_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;