'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { todos, type Todo } from '@/db/schema'
import { requireUser, createClient } from '@/utils/supabase/server'

/**
 * Helper function to bulk delete media files from the Supabase Storage bucket
 * based on their public URLs.
 * 
 * @param {any} supabase - The initialized Supabase server client
 * @param {Pick<Todo, 'images' | 'files'>[]} todosToDelete - The list of todos containing media to delete
 */
async function deleteAssociatedMedia(supabase: any, todosToDelete: Pick<Todo, 'images' | 'files'>[]) {
    const urlsToDelete: string[] = [];

    for (const todo of todosToDelete) {
        if (Array.isArray(todo.images)) {
            urlsToDelete.push(...todo.images);
        }
        if (Array.isArray(todo.files)) {
            for (const file of todo.files) {
                if (file && typeof file === 'object' && 'url' in file && typeof file.url === 'string') {
                    urlsToDelete.push(file.url);
                }
            }
        }
    }

    if (urlsToDelete.length === 0) return;

    const pathsToDelete = urlsToDelete
        .map(url => {
            const match = url.match(/todo-media\/(.+)$/);
            return match ? match[1] : null;
        })
        .filter((path): path is string => path !== null);

    if (pathsToDelete.length > 0) {
        await supabase.storage.from('todo-media').remove(pathsToDelete);
    }
}
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
    const user = await requireUser()

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
    const user = await requireUser()
    const supabase = await createClient()

    // 2. Lookup existing media to delete from the storage bucket
    const [todoToDel] = await db
        .select({ images: todos.images, files: todos.files })
        .from(todos)
        .where(and(eq(todos.id, id), eq(todos.userId, user.id)))

    if (todoToDel) {
        await deleteAssociatedMedia(supabase, [todoToDel as Pick<Todo, 'images' | 'files'>]);
    }

    // 3. Delete the record from the database only if it belongs to the authenticated user
    // We use the `and` operator to enforce both ID and user ownership constraints
    await db.delete(todos).where(and(eq(todos.id, id), eq(todos.userId, user.id)))

    // 4. Refresh the todo page data
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
    const user = await requireUser()

    // 2. Perform sequential updates within a single transaction to prevent connection pool exhaustion
    await db.transaction(async (tx) => {
        for (const item of items) {
            await tx
                .update(todos)
                .set({ sequence: item.sequence })
                .where(and(eq(todos.id, item.id), eq(todos.userId, user.id)))
        }
    })

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
    const user = await requireUser()

    // 2. Perform sequential updates within a single transaction to prevent connection pool exhaustion
    await db.transaction(async (tx) => {
        for (const item of items) {
            await tx
                .update(todos)
                .set({ text: item.text })
                .where(and(eq(todos.id, item.id), eq(todos.userId, user.id)))
        }
    })

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
    const user = await requireUser()

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
    const user = await requireUser()
    const supabase = await createClient()

    if (ids.length === 0) return

    // 2. Lookup existing media to delete from the storage bucket
    const todosToDelete = await db
        .select({ images: todos.images, files: todos.files })
        .from(todos)
        .where(and(inArray(todos.id, ids), eq(todos.userId, user.id)))

    await deleteAssociatedMedia(supabase, todosToDelete as Pick<Todo, 'images' | 'files'>[]);

    // 3. Perform bulk delete
    await db
        .delete(todos)
        .where(and(inArray(todos.id, ids), eq(todos.userId, user.id)))

    // 4. Refresh the todo page data
    revalidatePath('/todo')
}

/**
 * Updates the details of a specific Todo item.
 * 
 * @param {number} id - The ID of the Todo item
 * @param {Partial<Pick<Todo, 'text' | 'description' | 'images' | 'files' | 'parentId'>>} details - The fields to update
 * @throws {Error} If the user is unauthenticated
 */
export async function updateTodoDetails(id: number, details: Partial<Pick<Todo, 'text' | 'description' | 'images' | 'files' | 'parentId'>>) {
    // 1. Verify who is making the request
    const user = await requireUser()
    const supabase = await createClient()

    // 2. If files or images are updated, we check for removed ones and delete them from storage to avoid orphaned files
    if (details.images !== undefined || details.files !== undefined) {
        const [existingTodo] = await db
            .select({ images: todos.images, files: todos.files })
            .from(todos)
            .where(and(eq(todos.id, id), eq(todos.userId, user.id)))

        if (existingTodo) {
            const urlsToDelete: string[] = [];

            if (details.images !== undefined) {
                const oldImages = Array.isArray(existingTodo.images) ? existingTodo.images as string[] : [];
                const newImages = Array.isArray(details.images) ? details.images as string[] : [];
                urlsToDelete.push(...oldImages.filter(img => !newImages.includes(img)));
            }

            if (details.files !== undefined) {
                const oldFiles = Array.isArray(existingTodo.files) ? existingTodo.files as any[] : [];
                const newFiles = Array.isArray(details.files) ? details.files as any[] : [];

                oldFiles.forEach(oldFile => {
                    if (oldFile && oldFile.url && !newFiles.some(nf => nf.url === oldFile.url)) {
                        urlsToDelete.push(oldFile.url);
                    }
                });
            }

            if (urlsToDelete.length > 0) {
                const pathsToDelete = urlsToDelete
                    .map(url => {
                        const match = url.match(/todo-media\/(.+)$/);
                        return match ? match[1] : null;
                    })
                    .filter((path): path is string => path !== null);

                if (pathsToDelete.length > 0) {
                    await supabase.storage.from('todo-media').remove(pathsToDelete);
                }
            }
        }
    }

    // 3. Perform update
    await db
        .update(todos)
        .set(details)
        .where(and(eq(todos.id, id), eq(todos.userId, user.id)))

    // 4. Refresh the todo page data
    revalidatePath('/todo')
}