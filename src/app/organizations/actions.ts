'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { organizations, userOrganizations, todoOrganizations, profiles, todos, type Organization } from '@/db/schema'
import { requireUser } from '@/utils/supabase/server'
import { eq, inArray } from 'drizzle-orm'

/**
 * Creates a new Organization.
 * 
 * @param {string} name - The name of the new Organization
 * @throws {Error} If the user is unauthenticated
 */
export async function createOrganization(name: string) {
    await requireUser()

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
