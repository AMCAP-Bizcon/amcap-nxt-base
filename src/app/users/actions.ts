'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { profiles, userManagementRelationships, type Profile, userRoles } from '@/db/schema'
import { requireUser } from '@/utils/supabase/server'
import { requirePermission } from '@/utils/rbac'
import { eq, and, or, sql, inArray } from 'drizzle-orm'
import { logChange } from '@/utils/changelogs'

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
    await requirePermission('users', 'update')

    // 2. Perform update
    if (Object.keys(details).length > 0) {
        await db
            .update(profiles)
            .set(details)
            .where(eq(profiles.id, id))
            
        await logChange('users', id, 'UPDATE', details)
    }

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
    await requirePermission('users', 'update')

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

    await logChange('users', userId, 'UPDATE', { management: { managerIds, managedUserIds } })

    revalidatePath('/users');
}

/**
 * Updates the organizations a specific user belongs to.
 * 
 * @param {string} userId - The UUID of the user
 * @param {number[]} organizationIds - The IDs of all its organizations
 * @throws {Error} If the user is unauthenticated
 */
export async function updateUserOrganizations(userId: string, organizationIds: number[]) {
    await requireUser()
    await requirePermission('users', 'update')
    const { userOrganizations } = await import('@/db/schema'); // dynamic import or add to top

    await db.transaction(async (tx) => {
        await tx.delete(userOrganizations).where(eq(userOrganizations.userId, userId));

        if (organizationIds.length > 0) {
            const values = organizationIds.map(orgId => ({
                userId,
                organizationId: orgId
            }));
            await tx.insert(userOrganizations).values(values);
        }
    });

    await logChange('users', userId, 'UPDATE', { organizationIds })

    revalidatePath('/users');
}

/**
 * Updates the sequence of multiple users for drag-and-drop reordering.
 *
 * @param {Array<{ id: string; sequence: number }>} updates - An array containing the IDs and new sequences
 * @throws {Error} If the user is unauthenticated
 */
export async function updateUserSequence(updates: { id: string; sequence: number }[]) {
    await requireUser()
    await requirePermission('users', 'update')

    if (updates.length > 0) {
        await db.transaction(async (tx) => {
            const promises = updates.map((update) =>
                tx.update(profiles)
                    .set({ sequence: update.sequence })
                    .where(eq(profiles.id, update.id))
            );
            await Promise.all(promises);
        });

        for (const update of updates) {
            await logChange('users', update.id, 'UPDATE', { sequence: update.sequence })
        }

        revalidatePath('/users')
    }
}

/**
 * Updates the display names of multiple users (batch edit).
 *
 * @param {Array<{ id: string; displayName: string }>} updates - An array containing the IDs and updated display names
 * @throws {Error} If the user is unauthenticated
 */
export async function updateUserNames(updates: { id: string; displayName: string }[]) {
    await requireUser()
    await requirePermission('users', 'update')

    if (updates.length > 0) {
        await db.transaction(async (tx) => {
            const promises = updates.map((update) =>
                tx.update(profiles)
                    .set({ displayName: update.displayName })
                    .where(eq(profiles.id, update.id))
            );
            await Promise.all(promises);
        });
        revalidatePath('/users')
    }
}

/**
 * Toggles the "done" status for multiple users.
 *
 * @param {string[]} ids - An array of User IDs to toggle
 * @throws {Error} If the user is unauthenticated
 */
export async function toggleUsersDoneStatus(ids: string[]) {
    await requireUser()
    await requirePermission('users', 'update')

    if (ids.length > 0) {
        await db.transaction(async (tx) => {
            // First get the current statuses
            const currentUsers = await tx.query.profiles.findMany({
                where: inArray(profiles.id, ids),
                columns: {
                    id: true,
                    done: true
                }
            })

            const promises = currentUsers.map(user =>
                tx.update(profiles)
                    .set({ done: !user.done })
                    .where(eq(profiles.id, user.id))
            )

            await Promise.all(promises)
        })

        for (const id of ids) {
            await logChange('users', id, 'UPDATE', { action: 'toggled done status' })
        }

        revalidatePath('/users')
    }
}

/**
 * Updates the roles assigned to a user across organizations.
 * 
 * @param {string} userId - The UUID of the user
 * @param {Array<{roleId: number, organizationId: number}>} assignments - The role assignments
 * @throws {Error} If the user is unauthenticated
 */
export async function updateUserRoles(userId: string, assignments: { roleId: number, organizationId: number }[]) {
    await requireUser()
    await requirePermission('users', 'update')

    await db.transaction(async (tx) => {
        // Delete existing role assignments for this user
        await tx.delete(userRoles).where(eq(userRoles.userId, userId));

        // Insert new ones
        if (assignments.length > 0) {
            const values = assignments.map((assignment) => ({
                userId,
                roleId: assignment.roleId,
                organizationId: assignment.organizationId
            }));
            await tx.insert(userRoles).values(values);
        }
    });

    await logChange('users', userId, 'UPDATE', { roleAssignments: assignments })

    revalidatePath('/users')
    revalidatePath('/roles')
    revalidatePath('/organizations')
}

