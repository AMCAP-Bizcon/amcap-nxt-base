import { db } from '@/db'
import { todos, todoRelationships } from '@/db/schema'
import { eq } from 'drizzle-orm'
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

    // 2. Fetch ONLY the todos belonging to this user
    // This is the equivalent of: SELECT * FROM todos WHERE user_id = '123'
    // Order by sequence first, then fallback to createdAt
    const userTodos = await db
        .select()
        .from(todos)
        .where(eq(todos.userId, user!.id))
        .orderBy(todos.sequence, todos.createdAt)

    const userRelationships = await db
        .select()
        .from(todoRelationships)
        .where(eq(todoRelationships.userId, user!.id))

    return (
        <div className="flex justify-center p-8 w-full flex-1 min-h-0 bg-transparent">
            <TodoList 
                initialTodos={userTodos} 
                initialRelationships={userRelationships} 
                selectedId={selectedId}
                activeTab={activeTab}
            />
        </div>
    )
}