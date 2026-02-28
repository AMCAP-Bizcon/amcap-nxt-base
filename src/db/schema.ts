import { pgTable, serial, text, boolean, timestamp, uuid, integer } from 'drizzle-orm/pg-core';
import { type InferSelectModel } from 'drizzle-orm';


/**
 * `todos` Database Table Schema Definition.
 * 
 * Columns:
 * - `id`: Auto-incrementing primary key.
 * - `text`: The textual content of the to-do item.
 * - `done`: Boolean flag indicating completion status.
 * - `userId`: Foreign key relating to the Supabase Auth User ID.
 * - `sequence`: Integer used to maintain a user-defined custom ordering (drag-and-drop).
 * - `createdAt`: Timestamp indicating when the record was inserted.
 */
export const todos = pgTable('todos', {
    id: serial('id').primaryKey(),
    text: text('text').notNull(),
    done: boolean('done').default(false).notNull(),
    userId: uuid('user_id').notNull(),
    sequence: integer('sequence').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Todo = InferSelectModel<typeof todos>;