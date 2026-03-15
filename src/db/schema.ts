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
    isPinned: boolean('is_pinned').default(false).notNull(),
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

/**
 * `profiles` Database Table Schema Definition.
 *
 * Mirrors Supabase Auth users into the public schema so Drizzle ORM can query them.
 * Populated automatically via a Postgres trigger on `auth.users` insert.
 *
 * Columns:
 * - `id`: UUID primary key matching `auth.users.id`.
 * - `email`: The user's email address (synced from auth).
 * - `displayName`: An editable display/full name.
 * - `phone`: An editable phone number.
 * - `createdAt`: Timestamp indicating when the profile was created.
 */
export const profiles = pgTable('profiles', {
    id: uuid('id').primaryKey(),
    email: text('email').notNull(),
    displayName: text('display_name'),
    phone: text('phone'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * `user_management_relationships` Database Table Schema Definition.
 *
 * Self-referential join table that models manager ↔ managed-user relationships.
 * A row means: the user `managerId` manages the account of `managedUserId`.
 *
 * Columns:
 * - `managerId`: FK → profiles.id (the manager).
 * - `managedUserId`: FK → profiles.id (the managed user).
 * Composite PK on (managerId, managedUserId).
 */
export const userManagementRelationships = pgTable('user_management_relationships', {
    managerId: uuid('manager_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    managedUserId: uuid('managed_user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
}, (t) => [
    primaryKey({ columns: [t.managerId, t.managedUserId] })
]);

export type Profile = InferSelectModel<typeof profiles>;
export type UserManagementRelationship = InferSelectModel<typeof userManagementRelationships>;