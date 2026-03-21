import { db } from '@/db'
import { profiles, userManagementRelationships, organizations, userOrganizations, roles, userRoles } from '@/db/schema'
import { eq, or, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { createClient } from '@/utils/supabase/server'
import { getPermittedOrganizations } from '@/utils/rbac'
import { UserList } from './UserList'

export default async function UsersPage(props: {
    searchParams: Promise<{ [key: string]: string | undefined }>
}) {
    const searchParams = await props.searchParams;
    const selectedId = searchParams.id || null;
    const activeTab = searchParams.tab || 'managers';

    // 1. Get the current user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null;

    // 2. Fetch profiles with a soft limit
    const creatorProfiles = alias(profiles, 'creatorProfiles')
    const permittedOrgIds = await getPermittedOrganizations('users', 'read')
    
    const allProfilesRaw = await db
        .select({
            profile: profiles,
            creator: {
                displayName: creatorProfiles.displayName,
                email: creatorProfiles.email
            }
        })
        .from(profiles)
        .leftJoin(creatorProfiles, eq(profiles.createdBy, creatorProfiles.id))
        .where(
            or(
                eq(profiles.id, user.id),
                eq(profiles.createdBy, user.id),
                permittedOrgIds.length > 0 ? inArray(profiles.id, db.select({ userId: userOrganizations.userId }).from(userOrganizations).where(inArray(userOrganizations.organizationId, permittedOrgIds))) : undefined
            )
        )
        .orderBy(profiles.email)
        .limit(100);

    const allProfiles = allProfilesRaw.map(({ profile, creator }) => ({
        ...profile,
        creatorDisplayName: creator?.displayName || creator?.email || 'Unknown User'
    }))

    // 3. Targeted relational queries based on selectedId
    let allRelationships: typeof userManagementRelationships.$inferSelect[] = [];
    let allUserOrgs: typeof userOrganizations.$inferSelect[] = [];
    let allUserRoles: typeof userRoles.$inferSelect[] = [];

    if (selectedId) {
        allRelationships = await db
            .select()
            .from(userManagementRelationships)
            .where(
                or(
                    eq(userManagementRelationships.managerId, selectedId),
                    eq(userManagementRelationships.managedUserId, selectedId)
                )
            );

        allUserOrgs = await db
            .select()
            .from(userOrganizations)
            .where(eq(userOrganizations.userId, selectedId));

        allUserRoles = await db
            .select()
            .from(userRoles)
            .where(eq(userRoles.userId, selectedId));
    }

    const allOrganizations = await db.select().from(organizations).orderBy(organizations.name);
    const allRoles = await db.select().from(roles).orderBy(roles.name);

    return (
        <div className="flex justify-center p-8 w-full flex-1 min-h-0 bg-transparent">
            <UserList
                initialProfiles={allProfiles}
                initialRelationships={allRelationships}
                initialOrganizations={allOrganizations}
                initialUserOrgs={allUserOrgs}
                initialRoles={allRoles}
                initialUserRoles={allUserRoles}
                selectedId={selectedId}
                activeTab={activeTab}
            />
        </div>
    )
}
