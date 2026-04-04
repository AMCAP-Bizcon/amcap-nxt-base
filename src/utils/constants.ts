import { db } from '@/db'
import { organizations } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { cache } from 'react'

/**
 * The name of the special "Global" organization used for platform-level permissions.
 * Roles assigned in this org grant permissions system-wide, enabling org-agnostic
 * operations like creating new organizations.
 */
export const GLOBAL_ORG_NAME = 'Global' as const;

/**
 * Retrieves the ID of the "Global" organization from the database.
 * Cached per-request via React's `cache()` to avoid redundant queries.
 *
 * @returns {Promise<number>} The Global organization's ID
 * @throws {Error} If the Global organization doesn't exist in the database
 */
export const getGlobalOrgId = cache(async (): Promise<number> => {
    const [globalOrg] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.name, GLOBAL_ORG_NAME))
        .limit(1);

    if (!globalOrg) {
        throw new Error(
            `Global organization not found. Please run the migration 0015_global_organization.sql.`
        );
    }

    return globalOrg.id;
});
