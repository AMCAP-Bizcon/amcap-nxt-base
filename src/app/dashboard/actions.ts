'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { todos } from '@/db/schema'
import { createClient } from '@/utils/supabase/server'
import { eq, and } from 'drizzle-orm'

/**
 * Creates a new Todo item for the currently authenticated user.
 * It strictly requires a valid session to perform database mutations.
 * 
 * @param {FormData} formData - The submitted form data containing 'todoText'
 * @throws {Error} If the user is unauthenticated
 */
export async function createTodo(formData: FormData) {
    // 1. Verify who is making the request
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Unauthorized")

    // 2. Extract the text from the form
    const text = formData.get('todoText') as string

    // 3. Insert into the database via Drizzle
    await db.insert(todos).values({
        text: text,
        userId: user.id,
    })

    // 4. Tell Next.js to refresh the dashboard page to show the new data
    revalidatePath('/dashboard')
}

/**
 * Deletes a specific Todo item based on its ID.
 * To ensure security, it requires the user to be authenticated and
 * verifies that the item belongs to the current user before deletion.
 * 
 * @param {number} id - The ID of the Todo item to delete
 * @throws {Error} If the user is unauthenticated
 */
export async function deleteTodo(id: number) {
    // 1. Verify who is making the request
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Unauthorized")

    // 2. Delete the record from the database only if it belongs to the authenticated user
    // We use the `and` operator to enforce both ID and user ownership constraints
    await db.delete(todos).where(and(eq(todos.id, id), eq(todos.userId, user.id)))

    // 3. Refresh the dashboard page data
    revalidatePath('/dashboard')
}