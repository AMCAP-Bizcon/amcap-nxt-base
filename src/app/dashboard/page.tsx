import { db } from '@/db'
import { todos } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createClient } from '@/utils/supabase/server'
import { createTodo } from './actions'
import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'

export default async function DashboardPage() {
    // 1. Get the current user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // 2. Fetch ONLY the todos belonging to this user
    // This is the equivalent of: SELECT * FROM todos WHERE user_id = '123'
    const userTodos = await db
        .select()
        .from(todos)
        .where(eq(todos.userId, user!.id))

    return (
        <div className="mx-auto max-w-2xl p-8">
            <h1 className="text-3xl font-bold mb-8">Your Dashboard</h1>

            {/* The Form to Add Data */}
            <form action={createTodo} className="flex gap-4 mb-8">
                <Input
                    type="text"
                    name="todoText"
                    required
                    placeholder="What needs to be done?"
                />
                <Button type="submit">
                    Add Todo
                </Button>
            </form>

            {/* The List to Display Data */}
            <ul className="space-y-3">
                {userTodos.map((todo) => (
                    <li key={todo.id} className="p-4 border border-gray-200 rounded-md bg-white shadow-sm flex justify-between">
                        <span>{todo.text}</span>
                        <span className="text-xs text-gray-400">
                            {todo.createdAt.toLocaleDateString()} | {todo.createdAt.toLocaleTimeString()}
                        </span>
                    </li>
                ))}
            </ul>

            {userTodos.length === 0 && (
                <p className="text-gray-500 text-center mt-8">No todos yet. Create one above!</p>
            )}
        </div>
    )
}