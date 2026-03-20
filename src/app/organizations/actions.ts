'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { organizations, userOrganizations, todoOrganizations, profiles, todos, type Organization, userRoles } from '@/db/schema'
import { requireUser } from '@/utils/supabase/server'
import { requirePermission } from '@/utils/rbac'
import { eq, inArray } from 'drizzle-orm'

/**
 * Creates a new Organization.
 * 
 * @param {string} name - The name of the new Organization
 * @throws {Error} If the user is unauthenticated
 */
export async function createOrganization(name: string) {
    await requireUser()
    await requirePermission('organizations', 'create')

    const [newOrg] = await db.insert(organizations).values({
        name,
    }).returning()

    revalidatePath('/organizations')

    return newOrg
}

/**
 * Updates the details of a specific Organization.
 * 
 * @param {number} id - The ID of the Organization
 * @param {Partial<Pick<Organization, 'name' | 'description'>>} details - The fields to update
 * @throws {Error} If the user is unauthenticated
 */
export async function updateOrganizationDetails(id: number, details: Partial<Pick<Organization, 'name' | 'description'>>) {
    await requireUser()
    await requirePermission('organizations', 'update')

    if (Object.keys(details).length > 0) {
        await db
            .update(organizations)
            .set(details)
            .where(eq(organizations.id, id))
    }

    revalidatePath('/organizations')
}

/**
 * Deletes a specific Organization.
 * 
 * @param {number} id - The ID of the Organization item to delete
 * @throws {Error} If the user is unauthenticated
 */
export async function deleteOrganization(id: number) {
    await requireUser()
    await requirePermission('organizations', 'delete')

    await db.delete(organizations).where(eq(organizations.id, id))

    revalidatePath('/organizations')
}

/**
 * Updates the users assigned to an organization.
 * 
 * @param {number} organizationId - The ID of the Organization
 * @param {string[]} userIds - The IDs of the users
 * @throws {Error} If the user is unauthenticated
 */
export async function updateOrganizationUsers(organizationId: number, userIds: string[]) {
    await requireUser()
    await requirePermission('organizations', 'update')

    await db.transaction(async (tx) => {
        // Delete existing mappings
        await tx.delete(userOrganizations).where(eq(userOrganizations.organizationId, organizationId));

        // Insert new ones
        if (userIds.length > 0) {
            const values = userIds.map((userId) => ({
                userId,
                organizationId
            }));
            await tx.insert(userOrganizations).values(values);
        }
    });

    revalidatePath('/organizations')
}

/**
 * Updates the todos assigned to an organization.
 * 
 * @param {number} organizationId - The ID of the Organization
 * @param {number[]} todoIds - The IDs of the todos
 * @throws {Error} If the user is unauthenticated
 */
export async function updateOrganizationTodos(organizationId: number, todoIds: number[]) {
    await requireUser()
    await requirePermission('organizations', 'update')

    await db.transaction(async (tx) => {
        // Delete existing mappings
        await tx.delete(todoOrganizations).where(eq(todoOrganizations.organizationId, organizationId));

        // Insert new ones
        if (todoIds.length > 0) {
            const values = todoIds.map((todoId) => ({
                todoId,
                organizationId
            }));
            await tx.insert(todoOrganizations).values(values);
        }
    });

    revalidatePath('/organizations')
}

/**
 * Updates the sequence of multiple organizations for drag-and-drop reordering.
 *
 * @param {Array<{ id: number; sequence: number }>} updates - An array containing the IDs and new sequences
 * @throws {Error} If the user is unauthenticated
 */
export async function updateOrgSequence(updates: { id: number; sequence: number }[]) {
    await requireUser()
    await requirePermission('organizations', 'update')

    if (updates.length > 0) {
        await db.transaction(async (tx) => {
            const promises = updates.map((update) =>
                tx.update(organizations)
                    .set({ sequence: update.sequence })
                    .where(eq(organizations.id, update.id))
            );
            await Promise.all(promises);
        });
        revalidatePath('/organizations')
    }
}

/**
 * Updates the names of multiple organizations (batch edit).
 *
 * @param {Array<{ id: number; name: string }>} updates - An array containing the IDs and updated names
 * @throws {Error} If the user is unauthenticated
 */
export async function updateOrgNames(updates: { id: number; name: string }[]) {
    await requireUser()
    await requirePermission('organizations', 'update')

    if (updates.length > 0) {
        await db.transaction(async (tx) => {
            const promises = updates.map((update) =>
                tx.update(organizations)
                    .set({ name: update.name })
                    .where(eq(organizations.id, update.id))
            );
            await Promise.all(promises);
        });
        revalidatePath('/organizations')
    }
}

/**
 * Toggles the "done" status for multiple organizations.
 *
 * @param {number[]} ids - An array of Organization IDs to toggle
 * @throws {Error} If the user is unauthenticated
 */
export async function toggleOrgsDoneStatus(ids: number[]) {
    await requireUser()
    await requirePermission('organizations', 'update')

    if (ids.length > 0) {
        await db.transaction(async (tx) => {
            // First get the current statuses
            const currentOrgs = await tx.query.organizations.findMany({
                where: inArray(organizations.id, ids),
                columns: {
                    id: true,
                    done: true
                }
            })

            const promises = currentOrgs.map(org =>
                tx.update(organizations)
                    .set({ done: !org.done })
                    .where(eq(organizations.id, org.id))
            )

            await Promise.all(promises)
        })

        revalidatePath('/organizations')
    }
}

/**
 * Deletes multiple organizations at once.
 *
 * @param {number[]} ids - An array of Organization IDs to delete
 * @throws {Error} If the user is unauthenticated
 */
export async function deleteMultipleOrgs(ids: number[]) {
    await requireUser()
    await requirePermission('organizations', 'delete')

    if (ids.length > 0) {
        await db.delete(organizations).where(inArray(organizations.id, ids));
        revalidatePath('/organizations');
    }
}

/**
 * Updates the roles assigned to users within an organization.
 * 
 * @param {number} organizationId - The ID of the Organization
 * @param {Array<{roleId: number, userId: string}>} assignments - The role assignments
 * @throws {Error} If the user is unauthenticated
 */
export async function updateOrganizationRoles(organizationId: number, assignments: { roleId: number, userId: string }[]) {
    await requireUser()
    await requirePermission('organizations', 'update')

    await db.transaction(async (tx) => {
        // Delete existing role assignments for this organization
        await tx.delete(userRoles).where(eq(userRoles.organizationId, organizationId));

        // Insert new ones
        if (assignments.length > 0) {
            const values = assignments.map((assignment) => ({
                organizationId,
                roleId: assignment.roleId,
                userId: assignment.userId
            }));
            await tx.insert(userRoles).values(values);
        }
    });

    revalidatePath('/organizations')
    revalidatePath('/roles')
    revalidatePath('/users')
}

