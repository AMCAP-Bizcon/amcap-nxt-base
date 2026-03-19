import { db } from '@/db'
import { todos, todoRelationships, todoMedia, organizations, todoOrganizations } from '@/db/schema'
import { eq, inArray, or } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'
import { TodoList } from './TodoList'

export default async function ToDoPage(props: {
    searchParams: Promise<{ [key: string]: string | undefined }>
}) {
    const searchParams = await props.searchParams;
    const selectedId = searchParams.id ? parseInt(searchParams.id, 10) : null;
    const activeTab = searchParams.tab || 'children';

    // 1. Get the current user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return <div>Not authenticated</div>;
    }

    // 2. Fetch ONLY the todos belonging to this user
    const userTodos = await db
        .select()
        .from(todos)
        .where(eq(todos.userId, user!.id))
        .orderBy(todos.sequence, todos.createdAt)

    const userTodoIds = userTodos.map(t => t.id);

    const userRelationships = userTodoIds.length > 0 ? await db
        .select()
        .from(todoRelationships)
        .where(
            or(
                inArray(todoRelationships.parentId, userTodoIds),
                inArray(todoRelationships.childId, userTodoIds)
            )
        ) : [];

    const allMedia = userTodoIds.length > 0 ? await db
        .select()
        .from(todoMedia)
        .where(inArray(todoMedia.todoId, userTodoIds)) : [];

    // Attach media to todos to match the expected UI structure
    const todosWithMedia = userTodos.map(t => ({
        ...t,
        images: allMedia.filter(m => m.todoId === t.id && m.mediaType === 'image').map(m => ({ url: m.url, path: m.path })),
        files: allMedia.filter(m => m.todoId === t.id && m.mediaType === 'file').map(m => {
            // Extract original filename from path if possible
            const parts = m.path.split('_');
            const name = parts.length > 1 ? parts.slice(1).join('_') : 'file';
            return { url: m.url, path: m.path, name };
        })
    }));

    const allOrganizations = await db.select().from(organizations).orderBy(organizations.name);
    const allTodoOrgs = await db.select().from(todoOrganizations);

    return (
        <div className="flex justify-center p-8 w-full flex-1 min-h-0 bg-transparent">
            <TodoList 
                initialTodos={todosWithMedia} 
                initialRelationships={userRelationships} 
                initialOrganizations={allOrganizations}
                initialTodoOrgs={allTodoOrgs}
                selectedId={selectedId}
                activeTab={activeTab}
            />
        </div>
    )
}