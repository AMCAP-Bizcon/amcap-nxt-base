import { config } from 'dotenv'
config({ path: '.env.local' })
import { db } from './src/db'
import { appTables } from './src/db/schema'

async function seedAppTables() {
    try {
        const tablesToInsert = [
            { tableName: 'todos' },
            { tableName: 'users' },
            { tableName: 'organizations' },
            { tableName: 'roles' }
        ];

        console.log('Seeding app_tables...');
        await db.insert(appTables).values(tablesToInsert).onConflictDoNothing();
        console.log('Seeded app_tables with success.');
    } catch (e) {
        console.error('Failed to seed app_tables', e);
    }
}
seedAppTables().then(() => process.exit(0));
