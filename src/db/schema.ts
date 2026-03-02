import { pgTable, serial, text, boolean, timestamp, uuid, integer, jsonb, primaryKey } from 'drizzle-orm/pg-core';
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
    description: text('description'),
    images: jsonb('images').default('[]').notNull(),
    files: jsonb('files').default('[]').notNull(),
    done: boolean('done').default(false).notNull(),
    userId: uuid('user_id').notNull(),
    sequence: integer('sequence').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const todoRelationships = pgTable('todo_relationships', {
    parentId: integer('parent_id').notNull().references(() => todos.id, { onDelete: 'cascade' }),
    childId: integer('child_id').notNull().references(() => todos.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
}, (t) => [
    primaryKey({ columns: [t.parentId, t.childId] })
]);

export type Todo = InferSelectModel<typeof todos>;
export type TodoRelationship = InferSelectModel<typeof todoRelationships>;