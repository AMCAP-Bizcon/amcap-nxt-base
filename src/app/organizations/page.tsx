import { db } from '@/db'
import { organizations, userOrganizations, todoOrganizations, profiles, todos, roles, userRoles } from '@/db/schema'
import { createClient } from '@/utils/supabase/server'
import { OrganizationsList } from './OrganizationsList'
import { eq, or, inArray } from 'drizzle-orm'
import { getPermittedOrganizations } from '@/utils/rbac'

export default async function OrganizationsPage(props: {
    searchParams: Promise<{ [key: string]: string | undefined }>
}) {
    const searchParams = await props.searchParams;
    const selectedId = searchParams.id ? parseInt(searchParams.id, 10) : null;
    const activeTab = searchParams.tab || 'users';

    // 1. Get the current user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null;

    // 2. Fetch permitted organizations
    const permittedOrgIds = await getPermittedOrganizations('organizations', 'read');

    const allOrganizationsRaw = await db
        .select({
            org: organizations,
            creator: {
                displayName: profiles.displayName,
                email: profiles.email
            }
        })
        .from(organizations)
        .leftJoin(profiles, eq(organizations.createdBy, profiles.id))
        .where(
            or(
                eq(organizations.createdBy, user.id),
                permittedOrgIds.length > 0 ? inArray(organizations.id, permittedOrgIds) : undefined
            )
        )
        .orderBy(organizations.name)

    const allOrganizations = allOrganizationsRaw.map(({ org, creator }) => ({
        ...org,
        creatorDisplayName: creator?.displayName || creator?.email || 'Unknown User'
    }))

    // Fetch related records
    const allUsers = await db.select().from(profiles).orderBy(profiles.displayName, profiles.email);

    const permittedTodoOrgIds = await getPermittedOrganizations('todos', 'read');
    const userTodos = await db.select().from(todos)
        .where(
            or(
                eq(todos.userId, user.id),
                permittedTodoOrgIds.length > 0
                    ? inArray(todos.id, db.select({ todoId: todoOrganizations.todoId }).from(todoOrganizations).where(inArray(todoOrganizations.organizationId, permittedTodoOrgIds)))
                    : undefined
            )
        )
        .orderBy(todos.sequence);

    const allUserOrganizations = await db.select().from(userOrganizations);
    const allTodoOrganizations = await db.select().from(todoOrganizations);
    const allRoles = await db.select().from(roles).orderBy(roles.name);
    const allUserRoles = await db.select().from(userRoles);

    return (
        <div className="flex justify-center p-8 w-full flex-1 min-h-0 bg-transparent">
            <OrganizationsList
                initialOrganizations={allOrganizations}
                initialUserOrgs={allUserOrganizations}
                initialTodoOrgs={allTodoOrganizations}
                initialRoles={allRoles}
                initialUserRoles={allUserRoles}
                allProfiles={allUsers}
                allTodos={userTodos}
                selectedId={selectedId}
                activeTab={activeTab}
            />
        </div>
    )
}
