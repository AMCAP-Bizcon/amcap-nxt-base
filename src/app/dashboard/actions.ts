'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { todos } from '@/db/schema'
import { createClient } from '@/utils/supabase/server'
import { eq, and, inArray } from 'drizzle-orm'

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

/**
 * Updates the sequence of multiple Todo items.
 * 
 * @param {Array<{ id: number, sequence: number }>} items - The items with their new sequences
 * @throws {Error} If the user is unauthenticated
 */
export async function updateTodoSequence(items: { id: number; sequence: number }[]) {
    // 1. Verify who is making the request
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Unauthorized")

    // 2. Perform bulk update (looping is fine for small lists, otherwise consider batching/transactions)
    // Note: Drizzle currently doesn't have a simple bulk update, so we update one by one
    for (const item of items) {
        await db
            .update(todos)
            .set({ sequence: item.sequence })
            .where(and(eq(todos.id, item.id), eq(todos.userId, user.id)))
    }

    // 3. Refresh the dashboard page data
    revalidatePath('/dashboard')
}

/**
 * Updates the text content of multiple Todo items.
 * 
 * @param {Array<{ id: number, text: string }>} items - The items with their new texts
 * @throws {Error} If the user is unauthenticated
 */
export async function updateTodoTexts(items: { id: number; text: string }[]) {
    // 1. Verify who is making the request
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Unauthorized")

    // 2. Perform bulk update
    for (const item of items) {
        await db
            .update(todos)
            .set({ text: item.text })
            .where(and(eq(todos.id, item.id), eq(todos.userId, user.id)))
    }

    // 3. Refresh the dashboard page data
    revalidatePath('/dashboard')
}

/**
 * Marks multiple Todo items as done.
 * 
 * @param {Array<number>} ids - The IDs of the Todo items to mark as done
 * @throws {Error} If the user is unauthenticated
 */
export async function markTodosAsDone(ids: number[]) {
    // 1. Verify who is making the request
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Unauthorized")

    if (ids.length === 0) return

    // 2. Perform bulk update
    await db
        .update(todos)
        .set({ done: true })
        .where(and(inArray(todos.id, ids), eq(todos.userId, user.id)))

    // 3. Refresh the dashboard page data
    revalidatePath('/dashboard')
}

/**
 * Deletes multiple Todo items.
 * 
 * @param {Array<number>} ids - The IDs of the Todo items to delete
 * @throws {Error} If the user is unauthenticated
 */
export async function deleteMultipleTodos(ids: number[]) {
    // 1. Verify who is making the request
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Unauthorized")

    if (ids.length === 0) return

    // 2. Perform bulk delete
    await db
        .delete(todos)
        .where(and(inArray(todos.id, ids), eq(todos.userId, user.id)))

    // 3. Refresh the dashboard page data
    revalidatePath('/dashboard')
}