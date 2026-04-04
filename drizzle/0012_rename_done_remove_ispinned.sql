-- Migration: Rename 'done' → 'inactive' and remove 'is_pinned' from profiles, organizations, and roles.
-- These columns were copy-paste artifacts from the todos table. 'done' is renamed to 'inactive'
-- for better semantic meaning; 'is_pinned' is removed entirely as it's todo-specific.

-- Rename done → inactive
ALTER TABLE "profiles" RENAME COLUMN "done" TO "inactive";
ALTER TABLE "organizations" RENAME COLUMN "done" TO "inactive";
ALTER TABLE "roles" RENAME COLUMN "done" TO "inactive";

-- Remove isPinned
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "is_pinned";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "is_pinned";
ALTER TABLE "roles" DROP COLUMN IF EXISTS "is_pinned";
