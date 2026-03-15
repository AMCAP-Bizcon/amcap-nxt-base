'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { todos, todoRelationships, type Todo } from '@/db/schema'
import { requireUser, createClient } from '@/utils/supabase/server'

/**
 * Helper function to bulk delete media files from the Supabase Storage bucket
 * based on their public URLs.
 * 
 * @param {any} supabase - The initialized Supabase server client
 * @param {Pick<Todo, 'images' | 'files'>[]} todosToDelete - The list of todos containing media to delete
 */
async function deleteAssociatedMedia(supabase: any, todosToDelete: Pick<Todo, 'images' | 'files'>[]) {
    const pathsToDelete: string[] = [];

    for (const todo of todosToDelete) {
        if (Array.isArray(todo.images)) {
            for (const img of todo.images) {
                if (img && typeof img === 'object' && 'path' in img && typeof img.path === 'string') {
                    pathsToDelete.push(img.path);
                }
            }
        }
        if (Array.isArray(todo.files)) {
            for (const file of todo.files) {
                if (file && typeof file === 'object' && 'path' in file && typeof file.path === 'string') {
                    pathsToDelete.push(file.path);
                }
            }
        }
    }

    if (pathsToDelete.length === 0) return;

    await supabase.storage.from('todo-media').remove(pathsToDelete);
}
import { eq, and, or, inArray, sql } from 'drizzle-orm'

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
    const [newTodo] = await db.insert(todos).values({
        text: text,
        userId: user.id,
        sequence: newSequence,
    }).returning()

    // 3. Tell Next.js to refresh the dashboard page to show the new data
    revalidatePath('/todo')

    return newTodo
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

    if (items.length === 0) return

    // 2. Perform optimistic bulk update using a CASE expression
    const sqlChunks: any[] = []
    sqlChunks.push(sql`(case`)
    for (const item of items) {
        sqlChunks.push(sql`when ${todos.id} = ${item.id} then ${item.sequence}::integer`)
    }
    sqlChunks.push(sql`else ${todos.sequence} end)`)

    const finalSql = sql.join(sqlChunks, sql.raw(' '))

    await db
        .update(todos)
        .set({ sequence: finalSql })
        .where(
            and(
                inArray(todos.id, items.map((i) => i.id)),
                eq(todos.userId, user.id)
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
    const user = await requireUser()

    if (items.length === 0) return

    // 2. Perform optimistic bulk update using a CASE expression
    const sqlChunks: any[] = []
    sqlChunks.push(sql`(case`)
    for (const item of items) {
        sqlChunks.push(sql`when ${todos.id} = ${item.id} then ${item.text}::text`)
    }
    sqlChunks.push(sql`else ${todos.text} end)`)

    const finalSql = sql.join(sqlChunks, sql.raw(' '))

    await db
        .update(todos)
        .set({ text: finalSql })
        .where(
            and(
                inArray(todos.id, items.map((i) => i.id)),
                eq(todos.userId, user.id)
            )
        )

    // 3. Refresh the todo page data
    revalidatePath('/todo')
}

/**
 * Toggles the pinned status of a single Todo item.
 * 
 * @param {number} id - The ID of the Todo item
 * @throws {Error} If the user is unauthenticated
 */
export async function toggleTodoPin(id: number) {
    const user = await requireUser()

    await db
        .update(todos)
        .set({ isPinned: sql`NOT ${todos.isPinned}` })
        .where(and(eq(todos.id, id), eq(todos.userId, user.id)))

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
 * @param {Partial<Pick<Todo, 'text' | 'description' | 'images' | 'files'>>} details - The fields to update
 * @throws {Error} If the user is unauthenticated
 */
export async function updateTodoDetails(id: number, details: Partial<Pick<Todo, 'text' | 'description' | 'images' | 'files' | 'isPinned'>>) {
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
            const pathsToDelete: string[] = [];

            if (details.images !== undefined) {
                const oldImages = Array.isArray(existingTodo.images) ? existingTodo.images as { url: string, path: string }[] : [];
                const newImages = Array.isArray(details.images) ? details.images as { url: string, path: string }[] : [];
                
                oldImages.forEach(oldImg => {
                    if (oldImg && oldImg.path && !newImages.some(ni => ni.path === oldImg.path)) {
                        pathsToDelete.push(oldImg.path);
                    }
                });
            }

            if (details.files !== undefined) {
                const oldFiles = Array.isArray(existingTodo.files) ? existingTodo.files as { url: string, path: string }[] : [];
                const newFiles = Array.isArray(details.files) ? details.files as { url: string, path: string }[] : [];

                oldFiles.forEach(oldFile => {
                    if (oldFile && oldFile.path && !newFiles.some(nf => nf.path === oldFile.path)) {
                        pathsToDelete.push(oldFile.path);
                    }
                });
            }

            if (pathsToDelete.length > 0) {
                await supabase.storage.from('todo-media').remove(pathsToDelete);
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

/**
 * Updates the parent and child relationships for a specific Todo.
 * Uses a Postgres Recursive CTE to correctly validate cycle dependencies.
 * 
 * @param {number} todoId - The ID of the Todo being updated
 * @param {number[]} parentIds - The IDs of all its parents
 * @param {number[]} childIds - The IDs of all its children
 * @throws {Error} If updating would create a cycle or user is unauthenticated
 */
export async function updateTodoRelationships(todoId: number, parentIds: number[], childIds: number[]) {
    // 1. Verify who is making the request
    const user = await requireUser()

    await db.transaction(async (tx) => {
        // 1. Fetch current relationships involving this todoId
        const currentRelationships = await tx
            .select()
            .from(todoRelationships)
            .where(
                and(
                    eq(todoRelationships.userId, user.id),
                    or(
                        eq(todoRelationships.parentId, todoId),
                        eq(todoRelationships.childId, todoId)
                    )
                )
            );

        // Map them to comparison strings "parentId-childId"
        const currentSet = new Set(currentRelationships.map(r => `${r.parentId}-${r.childId}`));

        // 2. Determine target relationships
        const targetSet = new Set<string>();
        for (const p of parentIds) targetSet.add(`${p}-${todoId}`);
        for (const c of childIds) targetSet.add(`${todoId}-${c}`);

        // 3. Calculate diffs
        const toDelete: { parentId: number, childId: number }[] = [];
        for (const r of currentRelationships) {
            if (!targetSet.has(`${r.parentId}-${r.childId}`)) {
                toDelete.push({ parentId: r.parentId, childId: r.childId });
            }
        }

        const toInsert: { parentId: number, childId: number, userId: string }[] = [];
        for (const p of parentIds) {
            if (!currentSet.has(`${p}-${todoId}`)) {
                toInsert.push({ parentId: p, childId: todoId, userId: user.id });
            }
        }
        for (const c of childIds) {
            if (!currentSet.has(`${todoId}-${c}`)) {
                toInsert.push({ parentId: todoId, childId: c, userId: user.id });
            }
        }

        // 4. Execute optimized updates
        if (toDelete.length > 0) {
            // Delete specific mismatched edges
            for (const rel of toDelete) {
                await tx.delete(todoRelationships).where(
                    and(
                        eq(todoRelationships.userId, user.id),
                        eq(todoRelationships.parentId, rel.parentId),
                        eq(todoRelationships.childId, rel.childId)
                    )
                );
            }
        }

        if (toInsert.length > 0) {
            await tx.insert(todoRelationships).values(toInsert);
        }

        // 5. Cycle validation via Recursive CTE
        const cycleCheck = await tx.execute(sql`
            WITH RECURSIVE search_graph(child_id) AS (
                SELECT child_id
                FROM todo_relationships
                WHERE parent_id = ${todoId} AND user_id = ${user.id}
                
                UNION
                
                SELECT r.child_id
                FROM todo_relationships r
                INNER JOIN search_graph sg ON r.parent_id = sg.child_id
                WHERE r.user_id = ${user.id}
            )
            SELECT 1 FROM search_graph WHERE child_id = ${todoId} LIMIT 1;
        `);

        if (cycleCheck.length > 0) {
            tx.rollback();
            throw new Error("Cannot save relationships: circular dependency detected.");
        }
    });

    revalidatePath('/todo');
}