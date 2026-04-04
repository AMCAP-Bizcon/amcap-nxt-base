-- Insert the special "Global" organization for platform-level permissions.
-- Users assigned roles in this organization gain those permissions system-wide.
-- This eliminates the need for optional organizationId in requirePermission.

INSERT INTO "organizations" (name, description, inactive, sequence, created_at)
VALUES (
  'Global',
  'System-wide global organization for platform-level permissions. Roles assigned here apply across all contexts.',
  false,
  -1,
  NOW()
)
ON CONFLICT DO NOTHING;
