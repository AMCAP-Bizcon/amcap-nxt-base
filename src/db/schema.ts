import { pgTable, serial, text, boolean, timestamp, uuid } from 'drizzle-orm/pg-core';

export const todos = pgTable('todos', {
    id: serial('id').primaryKey(),
    text: text('text').notNull(),
    done: boolean('done').default(false).notNull(),
    userId: uuid('user_id').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});