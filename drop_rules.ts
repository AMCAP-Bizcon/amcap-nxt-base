import { config } from 'dotenv'
config({ path: '.env.local' })
import { db } from './src/db'
import { sql } from 'drizzle-orm'

async function dropAccessRules() {
    try {
        await db.execute(sql`DROP TABLE IF EXISTS access_rules CASCADE;`);
        console.log('Skipped active prompt issue by dropping access_rules');
    } catch (e) {
        console.error(e);
    }
}
dropAccessRules().then(() => process.exit(0));
