import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const globalForDb = global as unknown as { conn: postgres.Sql | undefined };

// App uses the pooled DATABASE_URL
const conn = globalForDb.conn ?? postgres(process.env.DATABASE_URL!);

if (process.env.NODE_ENV !== 'production') globalForDb.conn = conn;

export const db = drizzle(conn, { schema });