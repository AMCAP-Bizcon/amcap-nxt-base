import { db } from '@/db'
import { todos } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'
import { createTodo } from './actions'
import { TodoList } from './TodoList'

export default async function ToDoPage() {
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

    return (
        <div className="mx-auto max-w-2xl p-8">
            <h1 className="text-3xl font-bold mb-8">Your ToDo List</h1>

            <TodoList initialTodos={userTodos} />
        </div>
    )
}