'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { roles, userRoles, type Role, accessRules } from '@/db/schema'
import { requireUser } from '@/utils/supabase/server'
import { requirePermission } from '@/utils/rbac'
import { eq, inArray } from 'drizzle-orm'

/**
 * Creates a new Role.
 * 
 * @param {string} name - The name of the new Role
 * @throws {Error} If the user is unauthenticated
 */
export async function createRole(name: string) {
    await requireUser()
    await requirePermission('roles', 'create')

    const [newRole] = await db.insert(roles).values({
        name,
    }).returning()

    revalidatePath('/roles')

    return newRole
}

/**
 * Updates the details of a specific Role.
 * 
 * @param {number} id - The ID of the Role
 * @param {Partial<Pick<Role, 'name' | 'description'>>} details - The fields to update
 * @throws {Error} If the user is unauthenticated
 */
export async function updateRoleDetails(id: number, details: Partial<Pick<Role, 'name' | 'description'>>) {
    await requireUser()
    await requirePermission('roles', 'update')

    if (Object.keys(details).length > 0) {
        await db
            .update(roles)
            .set(details)
            .where(eq(roles.id, id))
    }

    revalidatePath('/roles')
}

/**
 * Deletes a specific Role.
 * 
 * @param {number} id - The ID of the Role
 * @throws {Error} If the user is unauthenticated
 */
export async function deleteRole(id: number) {
    await requireUser()
    await requirePermission('roles', 'delete')

    await db.delete(roles).where(eq(roles.id, id))

    revalidatePath('/roles')
}

/**
 * Updates the sequence of multiple roles.
 */
export async function updateRoleSequence(updates: { id: number; sequence: number }[]) {
    await requireUser()
    await requirePermission('roles', 'update')

    if (updates.length > 0) {
        await db.transaction(async (tx) => {
            const promises = updates.map((update) =>
                tx.update(roles)
                    .set({ sequence: update.sequence })
                    .where(eq(roles.id, update.id))
            );
            await Promise.all(promises);
        });
        revalidatePath('/roles')
    }
}

/**
 * Updates the names of multiple roles (batch edit).
 */
export async function updateRoleNames(updates: { id: number; name: string }[]) {
    await requireUser()
    await requirePermission('roles', 'update')

    if (updates.length > 0) {
        await db.transaction(async (tx) => {
            const promises = updates.map((update) =>
                tx.update(roles)
                    .set({ name: update.name })
                    .where(eq(roles.id, update.id))
            );
            await Promise.all(promises);
        });
        revalidatePath('/roles')
    }
}

/**
 * Toggles the "done" status for multiple roles.
 */
export async function toggleRolesDoneStatus(ids: number[]) {
    await requireUser()
    await requirePermission('roles', 'update')

    if (ids.length > 0) {
        await db.transaction(async (tx) => {
            const currentRoles = await tx.query.roles.findMany({
                where: inArray(roles.id, ids),
                columns: { id: true, done: true }
            })

            const promises = currentRoles.map(role =>
                tx.update(roles)
                    .set({ done: !role.done })
                    .where(eq(roles.id, role.id))
            )

            await Promise.all(promises)
        })

        revalidatePath('/roles')
    }
}

/**
 * Deletes multiple roles at once.
 */
export async function deleteMultipleRoles(ids: number[]) {
    await requireUser()
    await requirePermission('roles', 'delete')

    if (ids.length > 0) {
        await db.delete(roles).where(inArray(roles.id, ids));
        revalidatePath('/roles');
    }
}

/**
 * Updates the user-organization assignments for a specific role.
 */
export async function updateRoleUsers(roleId: number, assignments: { userId: string, organizationId: number }[]) {
    await requireUser()
    await requirePermission('roles', 'update')

    await db.transaction(async (tx) => {
        // Delete all mappings for this role
        await tx.delete(userRoles).where(eq(userRoles.roleId, roleId));

        // Insert new ones
        if (assignments.length > 0) {
            const values = assignments.map((assignment) => ({
                roleId,
                userId: assignment.userId,
                organizationId: assignment.organizationId
            }));
            await tx.insert(userRoles).values(values);
        }
    });

    revalidatePath('/roles')
    revalidatePath('/users')
    revalidatePath('/organizations')
}

/**
 * Updates the access rules for a specific role.
 */
export async function updateRoleAccessRules(
    roleId: number, 
    rules: { tableName: string, canRead: boolean, canCreate: boolean, canUpdate: boolean, canDelete: boolean, isActive: boolean }[]
) {
    await requireUser()
    await requirePermission('roles', 'update')

    await db.transaction(async (tx) => {
        // Delete all mappings for this role
        await tx.delete(accessRules).where(eq(accessRules.roleId, roleId));

        // Insert new ones
        if (rules.length > 0) {
            const values = rules.map((r) => ({
                roleId,
                tableName: r.tableName,
                canRead: r.canRead,
                canCreate: r.canCreate,
                canUpdate: r.canUpdate,
                canDelete: r.canDelete,
                isActive: r.isActive
            }));
            await tx.insert(accessRules).values(values);
        }
    });

    revalidatePath('/roles')
}
