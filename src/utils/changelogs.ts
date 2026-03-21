import { db } from '@/db';
import { changelogs } from '@/db/schema';
import { requireUser } from '@/utils/supabase/server';

export async function logChange(tableName: string, recordId: string | number, action: 'CREATE' | 'UPDATE' | 'DELETE', changes: any) {
    try {
        const user = await requireUser();
        await db.insert(changelogs).values({
            tableName,
            recordId: String(recordId),
            userId: user.id,
            action,
            changes,
        });
    } catch (error) {
        console.error("Failed to log change:", error);
        // We don't want changelog failure to break the main transaction/action, so we just log the error.
    }
}
