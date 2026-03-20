import { requireUser } from './supabase/server'
import { db } from '@/db'
import { userRoles, accessRules, appTables } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export type PermissionAction = 'read' | 'create' | 'update' | 'delete'

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

    // Map action to the corresponding boolean column name in the schema
    const actionColumn = 
        action === 'read' ? accessRules.canRead :
        action === 'create' ? accessRules.canCreate :
        action === 'update' ? accessRules.canUpdate :
        accessRules.canDelete

    // Query to check if the user has AT LEAST ONE active rule that grants this permission
    const result = await db
        .select({ id: accessRules.id })
        .from(accessRules)
        .innerJoin(userRoles, eq(userRoles.roleId, accessRules.roleId))
        .innerJoin(appTables, eq(appTables.id, accessRules.tableId))
        .where(
            and(
                eq(userRoles.userId, user.id),
                eq(appTables.tableName, appName),
                eq(accessRules.isActive, true),
                eq(actionColumn, true)
            )
        )
        .limit(1)

    if (result.length === 0) {
        throw new Error(`Forbidden: Missing '${action}' permission for '${appName}'`)
    }
}
