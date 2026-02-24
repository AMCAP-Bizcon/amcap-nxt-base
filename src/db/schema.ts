import { pgTable, serial, text, boolean, timestamp, uuid, integer } from 'drizzle-orm/pg-core';

export const todos = pgTable('todos', {
    id: serial('id').primaryKey(),
    text: text('text').notNull(),
    done: boolean('done').default(false).notNull(),
    userId: uuid('user_id').notNull(),
    sequence: integer('sequence').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});