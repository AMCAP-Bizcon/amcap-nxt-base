import { db } from '@/db'
import { organizations, userOrganizations, todoOrganizations, profiles, todos } from '@/db/schema'
import { createClient } from '@/utils/supabase/server'
import { OrganizationsList } from './OrganizationsList'
import { eq } from 'drizzle-orm'

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

    // 2. Fetch all organizations
    const allOrganizations = await db
        .select()
        .from(organizations)
        .orderBy(organizations.name)

    // Fetch related records
    const allUsers = await db.select().from(profiles).orderBy(profiles.displayName, profiles.email);

    // Only fetch todos belonging to the user for now, or all todos?
    // Since an organization can contain todos from multiple users, let's fetch all todos the user belongs to.
    // Actually, according to the rules, we fetch User's todos. 
    // "fetch ONLY the todos belonging to this user" was the rule for ToDo app, but for Orgs app it depends.
    // I'll fetch *all* todos if they are shared, but for simplicity let's fetch user's todos.
    // Let's fetch all todos and filter if needed, or query todos for the user.
    // For now, let's fetch user's todos to assign to organization.
    const userTodos = await db.select().from(todos).where(eq(todos.userId, user.id)).orderBy(todos.sequence);

    const allUserOrganizations = await db.select().from(userOrganizations);
    const allTodoOrganizations = await db.select().from(todoOrganizations);

    return (
        <div className="flex justify-center p-8 w-full flex-1 min-h-0 bg-transparent">
            <OrganizationsList
                initialOrganizations={allOrganizations}
                initialUserOrgs={allUserOrganizations}
                initialTodoOrgs={allTodoOrganizations}
                allProfiles={allUsers}
                allTodos={userTodos}
                selectedId={selectedId}
                activeTab={activeTab}
            />
        </div>
    )
}
