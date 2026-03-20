'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { todos, todoRelationships, todoMedia, type Todo } from '@/db/schema'
import { requireUser, createClient } from '@/utils/supabase/server'
import { requirePermission } from '@/utils/rbac'
import { eq, and, or, inArray, sql } from 'drizzle-orm'

/**
 * Helper function to bulk delete media files from the Supabase Storage bucket
 * based on their public URLs.
 * 
 * @param {any} supabase - The initialized Supabase server client
 * @param {number[]} todoIds - The IDs of todos whose media should be deleted
 */
async function deleteAssociatedMedia(supabase: any, todoIds: number[]) {
    if (todoIds.length === 0) return;

    const mediaRecords = await db.select({ path: todoMedia.path }).from(todoMedia).where(inArray(todoMedia.todoId, todoIds));
    const pathsToDelete = mediaRecords.map(m => m.path);

    if (pathsToDelete.length === 0) return;

    await supabase.storage.from('todo-media').remove(pathsToDelete);
}

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
    await requirePermission('todos', 'create')

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
    await requirePermission('todos', 'delete')
    const supabase = await createClient()

    // 2. Verify ownership and delete media from the storage bucket
    const [todoToDel] = await db
        .select({ id: todos.id })
        .from(todos)
        .where(and(eq(todos.id, id), eq(todos.userId, user.id)))

    if (todoToDel) {
        await deleteAssociatedMedia(supabase, [id]);
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
    await requirePermission('todos', 'update')

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
    await requirePermission('todos', 'update')

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
    await requirePermission('todos', 'update')

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
    await requirePermission('todos', 'update')

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
    await requirePermission('todos', 'delete')
    const supabase = await createClient()

    if (ids.length === 0) return

    // 2. Verify ownership and lookup existing media to delete from the storage bucket
    const todosToDelete = await db
        .select({ id: todos.id })
        .from(todos)
        .where(and(inArray(todos.id, ids), eq(todos.userId, user.id)))

    const validIds = todosToDelete.map(t => t.id)
    if (validIds.length > 0) {
        await deleteAssociatedMedia(supabase, validIds);
    }

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
 * @param {Partial<Pick<Todo, 'text' | 'description' | 'isPinned'>> & { images?: { url: string, path: string }[], files?: { url: string, path: string }[] }} details - The fields to update
 * @throws {Error} If the user is unauthenticated
 */
export async function updateTodoDetails(id: number, details: Partial<Pick<Todo, 'text' | 'description' | 'isPinned'>> & { images?: { url: string, path: string }[], files?: { url: string, path: string }[] }) {
    // 1. Verify who is making the request
    const user = await requireUser()
    await requirePermission('todos', 'update')
    const supabase = await createClient()

    // Verify ownership
    const [todo] = await db.select({ id: todos.id }).from(todos).where(and(eq(todos.id, id), eq(todos.userId, user.id)))
    if (!todo) return

    if (details.images !== undefined || details.files !== undefined) {
        const existingMedia = await db.select().from(todoMedia).where(eq(todoMedia.todoId, id));
        const pathsToDelete: string[] = [];

        if (details.images !== undefined) {
            const oldImages = existingMedia.filter(m => m.mediaType === 'image');
            const newImages = details.images;

            const imgsToDeletePaths = oldImages.filter(oldImg => !newImages.some(ni => ni.path === oldImg.path)).map(m=>m.path);
            pathsToDelete.push(...imgsToDeletePaths);

            const imagesToInsert = newImages.filter(ni => !oldImages.some(oldImg => oldImg.path === ni.path));
            if (imagesToInsert.length > 0) {
                await db.insert(todoMedia).values(imagesToInsert.map(img => ({
                    todoId: id,
                    mediaType: 'image',
                    url: img.url,
                    path: img.path,
                })));
            }

            if (imgsToDeletePaths.length > 0) {
                 await db.delete(todoMedia).where(and(eq(todoMedia.todoId, id), eq(todoMedia.mediaType, 'image'), inArray(todoMedia.path, imgsToDeletePaths)));
            }
        }

        if (details.files !== undefined) {
            const oldFiles = existingMedia.filter(m => m.mediaType === 'file');
            const newFiles = details.files;

            const filesToRemovePaths = oldFiles.filter(oldFile => !newFiles.some(nf => nf.path === oldFile.path)).map(m=>m.path);
            pathsToDelete.push(...filesToRemovePaths);

            const filesToInsert = newFiles.filter(nf => !oldFiles.some(oldFile => oldFile.path === nf.path));
            if (filesToInsert.length > 0) {
                await db.insert(todoMedia).values(filesToInsert.map(f => ({
                    todoId: id,
                    mediaType: 'file',
                    url: f.url,
                    path: f.path,
                })));
            }

            if (filesToRemovePaths.length > 0) {
                await db.delete(todoMedia).where(and(eq(todoMedia.todoId, id), eq(todoMedia.mediaType, 'file'), inArray(todoMedia.path, filesToRemovePaths)));
            }
        }

        if (pathsToDelete.length > 0) {
            await supabase.storage.from('todo-media').remove(pathsToDelete);
        }
    }

    const { images, files, ...todoDetails } = details;
    
    if (Object.keys(todoDetails).length > 0) {
        await db
            .update(todos)
            .set(todoDetails)
            .where(and(eq(todos.id, id), eq(todos.userId, user.id)))
    }

    revalidatePath('/todo')
}

/**
 * Updates the parent and child relationships for a specific Todo.
 * Uses a Postgres Recursive CTE to correctly validate cycle dependencies.
 * 
 * @param {number} todoId - The ID of the Todo being updated
 * @param {number[]} parentIds - The IDs of all its parents
 * @param {number[]} childIds - The IDs of all its children
 */
export async function updateTodoRelationships(todoId: number, parentIds: number[], childIds: number[]) {
    // 1. Verify who is making the request
    const user = await requireUser()
    await requirePermission('todos', 'update')

    try {
        await db.transaction(async (tx) => {
            // First, verify the user owns the `todoId`
            const [baseTodo] = await tx.select({ id: todos.id }).from(todos).where(and(eq(todos.id, todoId), eq(todos.userId, user.id)));
            if (!baseTodo) {
                tx.rollback();
                return;
            }

            const allRelatedIds = [...new Set([...parentIds, ...childIds])];
            if (allRelatedIds.length > 0) {
                const foundRelated = await tx.select({ id: todos.id }).from(todos).where(and(inArray(todos.id, allRelatedIds), eq(todos.userId, user.id)));
                if (foundRelated.length !== allRelatedIds.length) {
                    tx.rollback();
                    return;
                }
            }

            // Fetch current relationships involving this todoId
            const currentRelationships = await tx
                .select()
                .from(todoRelationships)
                .where(
                    or(
                        eq(todoRelationships.parentId, todoId),
                        eq(todoRelationships.childId, todoId)
                    )
                );

            const currentSet = new Set(currentRelationships.map(r => `${r.parentId}-${r.childId}`));

            const targetSet = new Set<string>();
            for (const p of parentIds) targetSet.add(`${p}-${todoId}`);
            for (const c of childIds) targetSet.add(`${todoId}-${c}`);

            const toDelete: { parentId: number, childId: number }[] = [];
            for (const r of currentRelationships) {
                if (!targetSet.has(`${r.parentId}-${r.childId}`)) {
                    toDelete.push({ parentId: r.parentId, childId: r.childId });
                }
            }

            const toInsert: { parentId: number, childId: number }[] = [];
            for (const p of parentIds) {
                if (!currentSet.has(`${p}-${todoId}`)) {
                    toInsert.push({ parentId: p, childId: todoId });
                }
            }
            for (const c of childIds) {
                if (!currentSet.has(`${todoId}-${c}`)) {
                    toInsert.push({ parentId: todoId, childId: c });
                }
            }

            if (toDelete.length > 0) {
                for (const rel of toDelete) {
                    await tx.delete(todoRelationships).where(
                        and(
                            eq(todoRelationships.parentId, rel.parentId),
                            eq(todoRelationships.childId, rel.childId)
                        )
                    );
                }
            }

            if (toInsert.length > 0) {
                await tx.insert(todoRelationships).values(toInsert);
            }

            // Cycle validation via Recursive CTE
            // Join with todos to ensure we only traverse relationships where the parent belongs to the user
            const cycleCheck = await tx.execute(sql`
                WITH RECURSIVE search_graph(child_id) AS (
                    SELECT r.child_id
                    FROM todo_relationships r
                    INNER JOIN todos t ON t.id = r.parent_id
                    WHERE r.parent_id = ${todoId} AND t.user_id = ${user.id}
                    
                    UNION
                    
                    SELECT r.child_id
                    FROM todo_relationships r
                    INNER JOIN search_graph sg ON r.parent_id = sg.child_id
                    INNER JOIN todos t ON t.id = r.parent_id
                    WHERE t.user_id = ${user.id}
                )
                SELECT 1 FROM search_graph WHERE child_id = ${todoId} LIMIT 1;
            `);

            if (cycleCheck.length > 0) {
                tx.rollback();
            }
        });

        revalidatePath('/todo');
        return { success: true };
    } catch (error: any) {
        if (error.message.includes("Rollback")) {
            return { success: false, error: "Cannot save relationships: circular dependency detected." };
        }
        return { success: false, error: error.message || "Failed to update relationships" };
    }
}

/**
 * Updates the organizations a specific todo belongs to.
 * 
 * @param {number} todoId - The ID of the Todo
 * @param {number[]} organizationIds - The IDs of all its organizations
 * @throws {Error} If the user is unauthenticated
 */
export async function updateTodoOrganizations(todoId: number, organizationIds: number[]) {
    await requireUser()
    await requirePermission('todos', 'update')
    const { todoOrganizations } = await import('@/db/schema'); // dynamic import or add to top

    await db.transaction(async (tx) => {
        await tx.delete(todoOrganizations).where(eq(todoOrganizations.todoId, todoId));

        if (organizationIds.length > 0) {
            const values = organizationIds.map(orgId => ({
                todoId,
                organizationId: orgId
            }));
            await tx.insert(todoOrganizations).values(values);
        }
    });

    revalidatePath('/todo');
}