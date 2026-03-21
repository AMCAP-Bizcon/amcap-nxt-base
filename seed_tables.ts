import { config } from 'dotenv'
config({ path: '.env.local' })

async function seedAppTables() {
    console.log('app_tables is obsolete. Skipping.');
}
seedAppTables().then(() => process.exit(0));
