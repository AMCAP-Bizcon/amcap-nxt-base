import { db } from '@/db'
import { roles, userRoles, profiles, organizations, accessRules, appTables } from '@/db/schema'
import { createClient } from '@/utils/supabase/server'
import { RolesList } from './RolesList'

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
    const allRoles = await db
        .select()
        .from(roles)
        .orderBy(roles.sequence)

    // Fetch related records
    const allProfiles = await db.select().from(profiles).orderBy(profiles.displayName, profiles.email);
    const allOrganizations = await db.select().from(organizations).orderBy(organizations.name);
    const allUserRoles = await db.select().from(userRoles);
    const allAccessRules = await db.select().from(accessRules);
    const allAppTables = await db.select().from(appTables).orderBy(appTables.tableName);

    return (
        <div className="flex justify-center p-8 w-full flex-1 min-h-0 bg-transparent">
            <RolesList
                initialRoles={allRoles}
                initialUserRoles={allUserRoles}
                initialAccessRules={allAccessRules}
                allAppTables={allAppTables}
                allProfiles={allProfiles}
                allOrganizations={allOrganizations}
                selectedId={selectedId}
                activeTab={activeTab}
            />
        </div>
    )
}
