'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { profiles, userManagementRelationships, type Profile } from '@/db/schema'
import { requireUser } from '@/utils/supabase/server'
import { eq, and, or, sql } from 'drizzle-orm'

/**
 * Updates the profile details for a specific user.
 * 
 * @param {string} id - The UUID of the user profile to update
 * @param {Partial<Pick<Profile, 'displayName' | 'phone'>>} details - The fields to update
 * @throws {Error} If the user is unauthenticated
 */
export async function updateProfile(id: string, details: Partial<Pick<Profile, 'displayName' | 'phone'>>) {
    // 1. Verify who is making the request
    await requireUser()

    // 2. Perform update
    await db
        .update(profiles)
        .set(details)
        .where(eq(profiles.id, id))

    // 3. Refresh the users page data
    revalidatePath('/users')
}

/**
 * Updates the manager and managed-by relationships for a specific user.
 * Uses a Postgres Recursive CTE to correctly validate cycle dependencies.
 * 
 * @param {string} userId - The UUID of the user being updated
 * @param {string[]} managerIds - The IDs of all its managers
 * @param {string[]} managedUserIds - The IDs of all its managed users
 * @throws {Error} If updating would create a cycle or user is unauthenticated
 */
export async function updateUserManagementRelationships(userId: string, managerIds: string[], managedUserIds: string[]) {
    // 1. Verify who is making the request
    await requireUser()

    await db.transaction(async (tx) => {
        // 1. Delete all existing relationships involving this userId
        // Either where managerId = userId OR managedUserId = userId
        await tx.delete(userManagementRelationships).where(
            or(
                eq(userManagementRelationships.managerId, userId),
                eq(userManagementRelationships.managedUserId, userId)
            )
        );

        // 2. Insert the new ones
        const newEdges: { managerId: string; managedUserId: string }[] = [];

        for (const mId of managerIds) {
            newEdges.push({ managerId: mId, managedUserId: userId });
        }
        for (const muId of managedUserIds) {
            newEdges.push({ managerId: userId, managedUserId: muId });
        }

        if (newEdges.length > 0) {
            await tx.insert(userManagementRelationships).values(newEdges);
        }

        // 3. Cycle validation via Recursive CTE
        // If there's a cycle, the graph now contains a path from userId back to userId.
        const cycleCheck = await tx.execute(sql`
            WITH RECURSIVE search_graph(managed_user_id) AS (
                -- Base case: users managed by userId
                SELECT managed_user_id
                FROM user_management_relationships
                WHERE manager_id = ${userId}
                
                UNION
                
                -- Recursive step: users managed by the current nodes
                SELECT r.managed_user_id
                FROM user_management_relationships r
                INNER JOIN search_graph sg ON r.manager_id = sg.managed_user_id
            )
            SELECT 1 FROM search_graph WHERE managed_user_id = ${userId} LIMIT 1;
        `);

        if (cycleCheck.length > 0) {
            tx.rollback();
            throw new Error("Cannot save relationships: circular management dependency detected.");
        }
    });

    revalidatePath('/users');
}
