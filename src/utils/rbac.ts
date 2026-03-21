import { requireUser } from './supabase/server'
import { db } from '@/db'
import { userRoles, accessRules } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { cache } from 'react'

export type PermissionAction = 'read' | 'create' | 'update' | 'delete'

// Cache all access rules for the user for the lifetime of the request
const getUserAccessRules = cache(async (userId: string, organizationId?: number) => {
    return await db
        .select({
            id: accessRules.id,
            tableName: accessRules.tableName,
            canRead: accessRules.canRead,
            canCreate: accessRules.canCreate,
            canUpdate: accessRules.canUpdate,
            canDelete: accessRules.canDelete,
        })
        .from(accessRules)
        .innerJoin(userRoles, eq(userRoles.roleId, accessRules.roleId))
        .where(
            and(
                eq(userRoles.userId, userId),
                eq(accessRules.isActive, true),
                organizationId !== undefined ? eq(userRoles.organizationId, organizationId) : undefined
            )
        )
})

/**
 * Ensures the authenticated user has the necessary permission for the specified app.
 * If organizationId is provided, validates that the user has the permission specifically within that organization.
 * Validates globally across any active role the user is assigned to if organizationId is not provided.
 * 
 * @param {string} appName - The app identifier (e.g., 'todos', 'organizations', 'users', 'roles')
 * @param {PermissionAction} action - The action being performed
 * @param {number} [organizationId] - Optional organization ID for tenant-aware scoping
 * @throws {Error} If the user is unauthenticated or forbidden
 */
export async function requirePermission(appName: string, action: PermissionAction, organizationId?: number) {
    const user = await requireUser()

    const rules = await getUserAccessRules(user.id, organizationId)

    const hasPermission = rules.some(rule => {
        if (rule.tableName !== appName) return false
        
        if (action === 'read') return rule.canRead
        if (action === 'create') return rule.canCreate
        if (action === 'update') return rule.canUpdate
        if (action === 'delete') return rule.canDelete
        
        return false
    })

    if (!hasPermission) {
        throw new Error(`Forbidden: Missing '${action}' permission for '${appName}'`)
    }
}
