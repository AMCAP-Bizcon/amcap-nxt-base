CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"phone" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_management_relationships" (
	"manager_id" uuid NOT NULL,
	"managed_user_id" uuid NOT NULL,
	CONSTRAINT "user_management_relationships_manager_id_managed_user_id_pk" PRIMARY KEY("manager_id","managed_user_id")
);
--> statement-breakpoint
ALTER TABLE "user_management_relationships" ADD CONSTRAINT "user_management_relationships_manager_id_profiles_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_management_relationships" ADD CONSTRAINT "user_management_relationships_managed_user_id_profiles_id_fk" FOREIGN KEY ("managed_user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;