import { db } from '@/db'
import { eq } from 'drizzle-orm'
import { roles, userRoles, profiles, organizations, accessRules } from '@/db/schema'
import { createClient } from '@/utils/supabase/server'
import { RolesList } from './RolesList'
import { roleOrganizations } from '@/db/schema'
import { or, inArray } from 'drizzle-orm'
import { getPermittedOrganizations } from '@/utils/rbac'

export default async function RolesPage(props: {
    searchParams: Promise<{ [key: string]: string | undefined }>
}) {
    const searchParams = await props.searchParams;
    const selectedId = searchParams.id ? parseInt(searchParams.id, 10) : null;
    const activeTab = searchParams.tab || 'assignments';

    // 1. Get the current user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null;

    // 2. Fetch all roles
    const permittedOrgIds = await getPermittedOrganizations('roles', 'read');

    const allRolesRaw = await db
        .select({
            role: roles,
            creator: {
                displayName: profiles.displayName,
                email: profiles.email
            }
        })
        .from(roles)
        .leftJoin(profiles, eq(roles.createdBy, profiles.id))
        .where(
            or(
                eq(roles.createdBy, user.id),
                permittedOrgIds.length > 0 
                  ? inArray(roles.id, db.select({ roleId: roleOrganizations.roleId }).from(roleOrganizations).where(inArray(roleOrganizations.organizationId, permittedOrgIds)))
                  : undefined
            )
        )
        .orderBy(roles.sequence)

    const allRoles = allRolesRaw.map(({ role, creator }) => ({
        ...role,
        creatorDisplayName: creator?.displayName || creator?.email || 'Unknown User'
    }))

    // Fetch related records
    const allProfiles = await db.select().from(profiles).orderBy(profiles.displayName, profiles.email);
    const permittedReadOrgIds = await getPermittedOrganizations('organizations', 'read');
    const allOrganizations = await db.select().from(organizations).where(
        or(
            eq(organizations.createdBy, user.id),
            permittedReadOrgIds.length > 0 ? inArray(organizations.id, permittedReadOrgIds) : undefined
        )
    ).orderBy(organizations.name);
    const allUserRoles = await db.select().from(userRoles);
    const allAccessRules = await db.select().from(accessRules);
    const allRoleOrganizations = await db.select().from(roleOrganizations);

    return (
        <div className="flex justify-center p-8 w-full flex-1 min-h-0 bg-transparent">
            <RolesList
                initialRoles={allRoles}
                initialUserRoles={allUserRoles}
                initialAccessRules={allAccessRules}
                initialRoleOrgs={allRoleOrganizations}

                allProfiles={allProfiles}
                allOrganizations={allOrganizations}
                selectedId={selectedId}
                activeTab={activeTab}
            />
        </div>
    )
}
