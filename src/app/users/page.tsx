import { db } from '@/db'
import { profiles, userManagementRelationships } from '@/db/schema'
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
    // We fetch all profiles because the Managers/Managed-By lists can include anyone.
    const allProfiles = await db
        .select()
        .from(profiles)
        .orderBy(profiles.email)

    const allRelationships = await db
        .select()
        .from(userManagementRelationships)

    return (
        <div className="flex justify-center p-8 w-full flex-1 min-h-0 bg-transparent">
            <UserList
                initialProfiles={allProfiles}
                initialRelationships={allRelationships}
                selectedId={selectedId}
                activeTab={activeTab}
            />
        </div>
    )
}
