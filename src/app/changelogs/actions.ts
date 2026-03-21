'use server'

import { db } from '@/db'
import { changelogs, profiles } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { requireUser } from '@/utils/supabase/server'

export async function getChangelogs(tableName: string, recordId: string | number) {
    await requireUser()

    const logs = await db
        .select({
            id: changelogs.id,
            action: changelogs.action,
            changes: changelogs.changes,
            createdAt: changelogs.createdAt,
            user: {
                id: profiles.id,
                displayName: profiles.displayName,
                email: profiles.email
            }
        })
        .from(changelogs)
        .leftJoin(profiles, eq(changelogs.userId, profiles.id))
        .where(
            and(
                eq(changelogs.tableName, tableName),
                eq(changelogs.recordId, String(recordId))
            )
        )
        .orderBy(desc(changelogs.createdAt))

    return logs
}
