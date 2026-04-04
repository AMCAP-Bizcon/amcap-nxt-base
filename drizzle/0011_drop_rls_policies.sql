-- Drop all RLS policies created in 0010_rls_policies.sql.
--
-- RATIONALE: The Drizzle ORM connects via the `postgres` superuser role through
-- the Supabase Transaction Pooler. This role bypasses RLS entirely, making the
-- policies ineffective. Since auth.uid() is never set in the Drizzle connection
-- context, these policies were never actually enforced.
--
-- All data security is enforced at the application level via the `requirePermission`
-- function in src/utils/rbac.ts and row-scoped queries in server actions.

-- Drop policies
DROP POLICY IF EXISTS "tenant_isolation_organizations" ON "organizations";
DROP POLICY IF EXISTS "tenant_isolation_user_orgs" ON "user_organizations";
DROP POLICY IF EXISTS "tenant_isolation_todos" ON "todos";
DROP POLICY IF EXISTS "tenant_isolation_todo_orgs" ON "todo_organizations";
DROP POLICY IF EXISTS "tenant_isolation_todo_media" ON "todo_media";
DROP POLICY IF EXISTS "tenant_isolation_todo_rels" ON "todo_relationships";
DROP POLICY IF EXISTS "tenant_isolation_profiles" ON "profiles";

-- Disable RLS on tables
ALTER TABLE "todos" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "todo_media" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "todo_relationships" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "todo_organizations" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "user_organizations" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" DISABLE ROW LEVEL SECURITY;
