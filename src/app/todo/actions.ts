'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { todos } from '@/db/schema'
import { createClient } from '@/utils/supabase/server'
import { eq, and, inArray, sql } from 'drizzle-orm'

/**
 * Creates a new Todo item for the currently authenticated user.
 * It strictly requires a valid session to perform database mutations.
 * 
 * @param {string} text - The text of the new Todo item
 * @throws {Error} If the user is unauthenticated
 */
export async function createTodo(text: string) {
    // 1. Verify who is making the request
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Unauthorized")

    // Find the current minimum sequence for this user's todos
    const [result] = await db
        .select({ minSeq: sql<number>`MIN(${todos.sequence})` })
        .from(todos)
        .where(eq(todos.userId, user.id))

    // Calculate the new minimum sequence
    const newSequence = result?.minSeq !== null ? Number(result.minSeq) - 1 : 0

    // 2. Insert into the database via Drizzle at the first position
    await db.insert(todos).values({
        text: text,
        userId: user.id,
        sequence: newSequence,
    })

    // 3. Tell Next.js to refresh the dashboard page to show the new data
    revalidatePath('/todo')
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

    // 3. Refresh the todo page data
    revalidatePath('/todo')
}

/**
 * Updates the sequence of multiple Todo items concurrently.
 * Replaces N+1 sequential database updates with Promise.all for better performance.
 * 
 * @param {Array<{ id: number, sequence: number }>} items - The items with their new sequences
 * @throws {Error} If the user is unauthenticated
 */
export async function updateTodoSequence(items: { id: number; sequence: number }[]) {
    // 1. Verify who is making the request
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Unauthorized")

    // 2. Perform concurrent updates using Promise.all to avoid N+1 query performance hits
    await Promise.all(
        items.map(item =>
            db
                .update(todos)
                .set({ sequence: item.sequence })
                .where(and(eq(todos.id, item.id), eq(todos.userId, user.id)))
        )
    )

    // 3. Refresh the todo page data
    revalidatePath('/todo')
}

/**
 * Updates the text content of multiple Todo items concurrently.
 * Replaces N+1 sequential database updates with Promise.all for better performance.
 * 
 * @param {Array<{ id: number, text: string }>} items - The items with their new texts
 * @throws {Error} If the user is unauthenticated
 */
export async function updateTodoTexts(items: { id: number; text: string }[]) {
    // 1. Verify who is making the request
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Unauthorized")

    // 2. Perform concurrent updates using Promise.all
    await Promise.all(
        items.map(item =>
            db
                .update(todos)
                .set({ text: item.text })
                .where(and(eq(todos.id, item.id), eq(todos.userId, user.id)))
        )
    )

    // 3. Refresh the todo page data
    revalidatePath('/todo')
}

/**
 * Toggles the done status of multiple Todo items.
 * 
 * @param {Array<number>} ids - The IDs of the Todo items to toggle
 * @throws {Error} If the user is unauthenticated
 */
export async function toggleTodosDoneStatus(ids: number[]) {
    // 1. Verify who is making the request
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error("Unauthorized")

    if (ids.length === 0) return

    // 2. Perform bulk update
    await db
        .update(todos)
        .set({ done: sql`NOT ${todos.done}` })
        .where(and(inArray(todos.id, ids), eq(todos.userId, user.id)))

    // 3. Refresh the todo page data
    revalidatePath('/todo')
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

    // 3. Refresh the todo page data
    revalidatePath('/todo')
}