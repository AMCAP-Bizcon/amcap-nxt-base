'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { roles, userRoles, type Role, accessRules, roleOrganizations } from '@/db/schema'
import { requireUser } from '@/utils/supabase/server'
import { requirePermission, getPermittedOrganizations } from '@/utils/rbac'
import { getGlobalOrgId } from '@/utils/constants'
import { eq, inArray, and, or, sql } from 'drizzle-orm'
import { logChange } from '@/utils/changelogs'

/**
 * Builds a Drizzle SQL filter that matches roles belonging to any of the
 * given organization IDs via the `role_organizations` join table.
 */
function roleOrgFilter(permittedOrgIds: number[]) {
    if (permittedOrgIds.length === 0) return sql`FALSE`;
    return inArray(
        roles.id,
        db.select({ roleId: roleOrganizations.roleId })
          .from(roleOrganizations)
          .where(inArray(roleOrganizations.organizationId, permittedOrgIds))
    );
}

/**
 * Creates a new Role.
 * 
 * @param {string} name - The name of the new Role
 * @throws {Error} If the user is unauthenticated
 */
export async function createRole(name: string) {
    const user = await requireUser()
    await requirePermission('roles', 'create', await getGlobalOrgId())

    const [newRole] = await db.insert(roles).values({
        name,
        createdBy: user.id
    }).returning()

    await logChange('roles', newRole.id, 'CREATE', newRole)

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
    const user = await requireUser()
    const permittedOrgIds = await getPermittedOrganizations('roles', 'update')

    const [role] = await db.select({ id: roles.id }).from(roles).where(
        and(
            eq(roles.id, id),
            or(eq(roles.createdBy, user.id), roleOrgFilter(permittedOrgIds))
        )
    )

    if (!role) throw new Error('Forbidden: You do not have permission to update this role')

    if (Object.keys(details).length > 0) {
        await db
            .update(roles)
            .set(details)
            .where(eq(roles.id, id))
            
        await logChange('roles', id, 'UPDATE', details)
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
    const user = await requireUser()
    const permittedOrgIds = await getPermittedOrganizations('roles', 'delete')

    const [role] = await db.select({ id: roles.id }).from(roles).where(
        and(
            eq(roles.id, id),
            or(eq(roles.createdBy, user.id), roleOrgFilter(permittedOrgIds))
        )
    )

    if (!role) throw new Error('Forbidden: You do not have permission to delete this role')

    await db.delete(roles).where(eq(roles.id, id))
    await logChange('roles', id, 'DELETE', { action: 'deleted record' })

    revalidatePath('/roles')
}

/**
 * Updates the sequence of multiple roles.
 */
export async function updateRoleSequence(updates: { id: number; sequence: number }[]) {
    const user = await requireUser()
    const permittedOrgIds = await getPermittedOrganizations('roles', 'update')
    
    const allowedRoles = await db.select({ id: roles.id }).from(roles).where(
        or(eq(roles.createdBy, user.id), roleOrgFilter(permittedOrgIds))
    )
    const allowedIds = new Set(allowedRoles.map(r => r.id))
    const validUpdates = updates.filter(u => allowedIds.has(u.id))

    if (validUpdates.length > 0) {
        await db.transaction(async (tx) => {
            const promises = validUpdates.map((update) =>
                tx.update(roles)
                    .set({ sequence: update.sequence })
                    .where(eq(roles.id, update.id))
            );
            await Promise.all(promises);
        });

        for (const update of validUpdates) {
            await logChange('roles', update.id, 'UPDATE', { sequence: update.sequence })
        }

        revalidatePath('/roles')
    }
}

/**
 * Updates the names of multiple roles (batch edit).
 */
export async function updateRoleNames(updates: { id: number; name: string }[]) {
    const user = await requireUser()
    const permittedOrgIds = await getPermittedOrganizations('roles', 'update')

    const allowedRoles = await db.select({ id: roles.id }).from(roles).where(
        or(eq(roles.createdBy, user.id), roleOrgFilter(permittedOrgIds))
    )
    const allowedIds = new Set(allowedRoles.map(r => r.id))
    const validUpdates = updates.filter(u => allowedIds.has(u.id))

    if (validUpdates.length > 0) {
        await db.transaction(async (tx) => {
            const promises = validUpdates.map((update) =>
                tx.update(roles)
                    .set({ name: update.name })
                    .where(eq(roles.id, update.id))
            );
            await Promise.all(promises);
        });

        for (const update of validUpdates) {
            await logChange('roles', update.id, 'UPDATE', { name: update.name })
        }

        revalidatePath('/roles')
    }
}

/**
 * Toggles the "inactive" status for multiple roles.
 */
export async function toggleRolesInactiveStatus(ids: number[]) {
    const user = await requireUser()
    const permittedOrgIds = await getPermittedOrganizations('roles', 'update')

    const allowedRoles = await db.select({ id: roles.id }).from(roles).where(
        and(inArray(roles.id, ids), or(eq(roles.createdBy, user.id), roleOrgFilter(permittedOrgIds)))
    )
    const validIds = allowedRoles.map(r => r.id)

    if (validIds.length > 0) {
        await db.transaction(async (tx) => {
            const currentRoles = await tx.query.roles.findMany({
                where: inArray(roles.id, validIds),
                columns: { id: true, inactive: true }
            })

            const promises = currentRoles.map(role =>
                tx.update(roles)
                    .set({ inactive: !role.inactive })
                    .where(eq(roles.id, role.id))
            )

            await Promise.all(promises)
        })

        for (const id of validIds) {
            await logChange('roles', id, 'UPDATE', { action: 'toggled inactive status' })
        }

        revalidatePath('/roles')
    }
}

/**
 * Deletes multiple roles at once.
 */
export async function deleteMultipleRoles(ids: number[]) {
    const user = await requireUser()
    const permittedOrgIds = await getPermittedOrganizations('roles', 'delete')

    const rolesToDelete = await db.select({ id: roles.id }).from(roles).where(
        and(inArray(roles.id, ids), or(eq(roles.createdBy, user.id), roleOrgFilter(permittedOrgIds)))
    )
    const validIds = rolesToDelete.map(r => r.id)

    if (validIds.length > 0) {
        await db.delete(roles).where(inArray(roles.id, validIds));

        for (const id of validIds) {
            await logChange('roles', id, 'DELETE', { action: 'deleted record' })
        }

        revalidatePath('/roles');
    }
}

/**
 * Updates the user-organization assignments for a specific role.
 */
export async function updateRoleUsers(roleId: number, assignments: { userId: string, organizationId: number }[]) {
    const user = await requireUser()
    const permittedOrgIds = await getPermittedOrganizations('roles', 'update')

    const [role] = await db.select({ id: roles.id }).from(roles).where(
        and(eq(roles.id, roleId), or(eq(roles.createdBy, user.id), roleOrgFilter(permittedOrgIds)))
    )
    if (!role) throw new Error('Forbidden: You do not have permission to update this role')

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

    await logChange('roles', roleId, 'UPDATE', { userAssignments: assignments })

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
    const user = await requireUser()
    const permittedOrgIds = await getPermittedOrganizations('roles', 'update')

    const [role] = await db.select({ id: roles.id }).from(roles).where(
        and(eq(roles.id, roleId), or(eq(roles.createdBy, user.id), roleOrgFilter(permittedOrgIds)))
    )
    if (!role) throw new Error('Forbidden: You do not have permission to update this role')

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

    await logChange('roles', roleId, 'UPDATE', { accessRules: rules })

    revalidatePath('/roles')
}

/**
 * Updates the organizations for a specific role.
 */
export async function updateRoleOrganizations(roleId: number, organizations: { organizationId: number }[]) {
    const user = await requireUser()
    const permittedOrgIds = await getPermittedOrganizations('roles', 'update')
    const accessibleOrgIds = await getPermittedOrganizations('organizations', 'read')

    const [role] = await db.select({ id: roles.id }).from(roles).where(
        and(eq(roles.id, roleId), or(eq(roles.createdBy, user.id), roleOrgFilter(permittedOrgIds)))
    )
    if (!role) throw new Error('Forbidden: You do not have permission to update this role')

    // Filter organizations to only those the user can access
    const validOrganizations = organizations.filter(org => accessibleOrgIds.includes(org.organizationId))

    await db.transaction(async (tx) => {
        // Delete all mappings for this role
        await tx.delete(roleOrganizations).where(eq(roleOrganizations.roleId, roleId));

        // Insert new ones
        if (validOrganizations.length > 0) {
            const values = validOrganizations.map((org) => ({
                roleId,
                organizationId: org.organizationId
            }));
            await tx.insert(roleOrganizations).values(values);
        }
    });

    await logChange('roles', roleId, 'UPDATE', { organizations: validOrganizations })

    revalidatePath('/roles')
}
