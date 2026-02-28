import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Global database connection instance for Drizzle ORM.
 * In development, this prevents exhausting database connections across
 * hot-reloads by storing the connection instance in the Node.js `global` object.
 * 
 * It uses the Supabase Transaction Pooler (DATABASE_URL) for efficient query execution.
 */
const globalForDb = global as unknown as { conn: postgres.Sql | undefined };

// App uses the pooled DATABASE_URL
const conn = globalForDb.conn ?? postgres(process.env.DATABASE_URL!);

if (process.env.NODE_ENV !== 'production') globalForDb.conn = conn;

export const db = drizzle(conn, { schema });