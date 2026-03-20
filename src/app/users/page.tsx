import { db } from '@/db'
import { profiles, userManagementRelationships, organizations, userOrganizations, roles, userRoles } from '@/db/schema'
import { createClient } from '@/utils/supabase/server'
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

    // 2. Fetch all profiles
    const allProfiles = await db
        .select()
        .from(profiles)
        .orderBy(profiles.email)

    const allRelationships = await db
        .select()
        .from(userManagementRelationships)

    const allOrganizations = await db.select().from(organizations).orderBy(organizations.name);
    const allUserOrgs = await db.select().from(userOrganizations);
    
    // Fetch roles
    const allRoles = await db.select().from(roles).orderBy(roles.name);
    const allUserRoles = await db.select().from(userRoles);

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
