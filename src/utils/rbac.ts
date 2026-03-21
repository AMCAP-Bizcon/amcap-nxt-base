import { requireUser } from './supabase/server'
import { db } from '@/db'
import { userRoles, accessRules } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { cache } from 'react'

export type PermissionAction = 'read' | 'create' | 'update' | 'delete'

// Cache all access rules for the user for the lifetime of the request
const getUserAccessRules = cache(async (userId: string) => {
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
                eq(accessRules.isActive, true)
            )
        )
})

/**
 * Ensures the authenticated user has the necessary permission for the specified app.
 * Validates globally across any active role the user is assigned to.
 * 
 * @param {string} appName - The app identifier (e.g., 'todos', 'organizations', 'users', 'roles')
 * @param {PermissionAction} action - The action being performed
 * @throws {Error} If the user is unauthenticated or forbidden
 */
export async function requirePermission(appName: string, action: PermissionAction) {
    const user = await requireUser()

    const rules = await getUserAccessRules(user.id)

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
