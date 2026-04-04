import { requireUser } from './supabase/server'
import { db } from '@/db'
import { userRoles, accessRules } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { cache } from 'react'

export type PermissionAction = 'read' | 'create' | 'update' | 'delete'

/**
 * Fetches all active access rules for a user within a specific organization.
 * Cached per-request via React's `cache()` to avoid redundant queries
 * when multiple permission checks are made in the same request.
 *
 * @param {string} userId - The authenticated user's ID
 * @param {number} organizationId - The organization to check permissions within
 * @returns Access rules matching the user's roles in the given organization
 */
const getUserAccessRules = cache(async (userId: string, organizationId: number) => {
    return await db
        .select({
            id: accessRules.id,
            tableName: accessRules.tableName,
            canRead: accessRules.canRead,
            canCreate: accessRules.canCreate,
            canUpdate: accessRules.canUpdate,
            canDelete: accessRules.canDelete,
            organizationId: userRoles.organizationId,
        })
        .from(accessRules)
        .innerJoin(userRoles, eq(userRoles.roleId, accessRules.roleId))
        .where(
            and(
                eq(userRoles.userId, userId),
                eq(accessRules.isActive, true),
                eq(userRoles.organizationId, organizationId)
            )
        )
})

/**
 * Fetches all active access rules for a user across ALL organizations.
 * Used by `getPermittedOrganizations` to discover which orgs a user
 * has a given permission in.
 *
 * @param {string} userId - The authenticated user's ID
 * @returns All active access rules for the user across all organizations
 */
const getAllUserAccessRules = cache(async (userId: string) => {
    return await db
        .select({
            id: accessRules.id,
            tableName: accessRules.tableName,
            canRead: accessRules.canRead,
            canCreate: accessRules.canCreate,
            canUpdate: accessRules.canUpdate,
            canDelete: accessRules.canDelete,
            organizationId: userRoles.organizationId,
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
 * Ensures the authenticated user has the necessary permission for the specified
 * app within a specific organization. This eliminates the "global escalation risk"
 * where a user could leverage permissions from one org to act in another.
 * 
 * For org-agnostic operations (e.g., creating an organization), pass the
 * Global organization ID via `getGlobalOrgId()` from `@/utils/constants`.
 * 
 * @param {string} appName - The app identifier (e.g., 'todos', 'organizations', 'users', 'roles')
 * @param {PermissionAction} action - The action being performed
 * @param {number} organizationId - The organization ID to check permissions within (REQUIRED)
 * @throws {Error} If the user is unauthenticated or forbidden
 */
export async function requirePermission(appName: string, action: PermissionAction, organizationId: number) {
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

/**
 * Gets a list of organization IDs where the user has the specified permission for an app.
 * This is used for data-fetching queries that need to scope results across all
 * organizations the user has access to.
 * 
 * @param {string} appName - The app identifier
 * @param {PermissionAction} action - The action being performed
 * @returns {Promise<number[]>} Array of permitted organization IDs
 */
export async function getPermittedOrganizations(appName: string, action: PermissionAction): Promise<number[]> {
    const user = await requireUser()
    const rules = await getAllUserAccessRules(user.id)
    
    const permittedOrgIds = new Set<number>()
    
    for (const rule of rules) {
        if (rule.tableName !== appName) continue
        
        const hasPerm = 
            (action === 'read' && rule.canRead) ||
            (action === 'create' && rule.canCreate) ||
            (action === 'update' && rule.canUpdate) ||
            (action === 'delete' && rule.canDelete)
            
        if (hasPerm && rule.organizationId !== null) {
            permittedOrgIds.add(rule.organizationId)
        }
    }
    
    return Array.from(permittedOrgIds)
}
