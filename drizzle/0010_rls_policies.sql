-- Enable RLS for core tables
ALTER TABLE "todos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "todo_media" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "todo_relationships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "todo_organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;

-- Policy for Organizations: Users can only see/modify organizations they are a member of.
CREATE POLICY "tenant_isolation_organizations" ON "organizations"
AS PERMISSIVE FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "user_organizations" "uo"
        WHERE "uo"."organization_id" = "organizations"."id" AND "uo"."user_id" = auth.uid()
    )
);

-- Policy for user_organizations: Users can see their own memberships, and memberships of orgs they belong to.
CREATE POLICY "tenant_isolation_user_orgs" ON "user_organizations"
AS PERMISSIVE FOR ALL
TO authenticated
USING (
    "user_id" = auth.uid() OR
    EXISTS (
        SELECT 1 FROM "user_organizations" "uo_self"
        WHERE "uo_self"."organization_id" = "user_organizations"."organization_id" AND "uo_self"."user_id" = auth.uid()
    )
);

-- Policy for Todos: Users can see/modify their own personal todos, OR todos linked to an organization they are a member of.
CREATE POLICY "tenant_isolation_todos" ON "todos"
AS PERMISSIVE FOR ALL
TO authenticated
USING (
    "user_id" = auth.uid() OR
    EXISTS (
        SELECT 1 FROM "todo_organizations" "to"
        JOIN "user_organizations" "uo" ON "uo"."organization_id" = "to"."organization_id"
        WHERE "to"."todo_id" = "todos"."id" AND "uo"."user_id" = auth.uid()
    )
);

-- Policy for Todo_Organizations:
CREATE POLICY "tenant_isolation_todo_orgs" ON "todo_organizations"
AS PERMISSIVE FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "user_organizations" "uo"
        WHERE "uo"."organization_id" = "todo_organizations"."organization_id" AND "uo"."user_id" = auth.uid()
    )
);

-- Policy for Todo_Media: inherits from Todos
CREATE POLICY "tenant_isolation_todo_media" ON "todo_media"
AS PERMISSIVE FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "todos" "t"
        LEFT JOIN "todo_organizations" "to" ON "to"."todo_id" = "t"."id"
        LEFT JOIN "user_organizations" "uo" ON "uo"."organization_id" = "to"."organization_id"
        WHERE "t"."id" = "todo_media"."todo_id" AND ("t"."user_id" = auth.uid() OR "uo"."user_id" = auth.uid())
    )
);

-- Policy for Todo_Relationships: inherits from parent_id in Todos
CREATE POLICY "tenant_isolation_todo_rels" ON "todo_relationships"
AS PERMISSIVE FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM "todos" "t"
        LEFT JOIN "todo_organizations" "to" ON "to"."todo_id" = "t"."id"
        LEFT JOIN "user_organizations" "uo" ON "uo"."organization_id" = "to"."organization_id"
        WHERE "t"."id" = "todo_relationships"."parent_id" AND ("t"."user_id" = auth.uid() OR "uo"."user_id" = auth.uid())
    )
);

-- Policy for Profiles: Users can see themselves, or members of their organizations
CREATE POLICY "tenant_isolation_profiles" ON "profiles"
AS PERMISSIVE FOR ALL
TO authenticated
USING (
    "id" = auth.uid() OR
    EXISTS (
        SELECT 1 FROM "user_organizations" "uo1"
        JOIN "user_organizations" "uo2" ON "uo1"."organization_id" = "uo2"."organization_id"
        WHERE "uo1"."user_id" = "profiles"."id" AND "uo2"."user_id" = auth.uid()
    )
);