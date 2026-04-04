-- Optimize the todo_organizations and user_organizations join tables with indexes.
-- These are critical for the subquery pattern used in permission-filtered queries:
--   inArray(todos.id, db.select({ todoId: todoOrganizations.todoId })
--     .from(todoOrganizations).where(inArray(todoOrganizations.organizationId, ...)))

CREATE INDEX IF NOT EXISTS idx_todo_orgs_todo_id ON "todo_organizations" ("todo_id");
CREATE INDEX IF NOT EXISTS idx_todo_orgs_org_id ON "todo_organizations" ("organization_id");
CREATE INDEX IF NOT EXISTS idx_user_orgs_user_id ON "user_organizations" ("user_id");
CREATE INDEX IF NOT EXISTS idx_user_orgs_org_id ON "user_organizations" ("organization_id");
