import { pgTable, serial, text, boolean, timestamp, uuid, integer, jsonb, primaryKey, varchar, AnyPgColumn } from 'drizzle-orm/pg-core';
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
    done: boolean('done').default(false).notNull(),
    isPinned: boolean('is_pinned').default(false).notNull(),
    userId: uuid('user_id').notNull(),
    sequence: integer('sequence').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    createdBy: uuid('created_by').references(() => profiles.id),
});

export const todoMedia = pgTable('todo_media', {
    id: serial('id').primaryKey(),
    todoId: integer('todo_id').notNull().references(() => todos.id, { onDelete: 'cascade' }),
    mediaType: text('media_type').notNull(),
    url: text('url').notNull(),
    path: text('path').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type TodoMedia = InferSelectModel<typeof todoMedia>;

export const todoRelationships = pgTable('todo_relationships', {
    parentId: integer('parent_id').notNull().references(() => todos.id, { onDelete: 'cascade' }),
    childId: integer('child_id').notNull().references(() => todos.id, { onDelete: 'cascade' }),
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
    inactive: boolean('inactive').default(false).notNull(),
    sequence: integer('sequence').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    createdBy: uuid('created_by').references((): AnyPgColumn => profiles.id),
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

/**
 * `organizations` Database Table Schema Definition.
 */
export const organizations = pgTable('organizations', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    inactive: boolean('inactive').default(false).notNull(),
    sequence: integer('sequence').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    createdBy: uuid('created_by').references(() => profiles.id),
});

/**
 * Join table for Users and Organizations
 */
export const userOrganizations = pgTable('user_organizations', {
    userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    organizationId: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
}, (t) => [
    primaryKey({ columns: [t.userId, t.organizationId] })
]);

/**
 * Join table for Todos and Organizations
 */
export const todoOrganizations = pgTable('todo_organizations', {
    todoId: integer('todo_id').notNull().references(() => todos.id, { onDelete: 'cascade' }),
    organizationId: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
}, (t) => [
    primaryKey({ columns: [t.todoId, t.organizationId] })
]);

export type Organization = InferSelectModel<typeof organizations>;
export type UserOrganization = InferSelectModel<typeof userOrganizations>;
export type TodoOrganization = InferSelectModel<typeof todoOrganizations>;

/**
 * `roles` Database Table Schema Definition.
 */
export const roles = pgTable('roles', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description'),
    inactive: boolean('inactive').default(false).notNull(),
    sequence: integer('sequence').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    createdBy: uuid('created_by').references(() => profiles.id),
});

/**
 * Join table for Users, Roles, and Organizations
 */
export const userRoles = pgTable('user_roles', {
    userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    roleId: integer('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    organizationId: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
}, (t) => [
    primaryKey({ columns: [t.userId, t.roleId, t.organizationId] })
]);

export const accessRules = pgTable('access_rules', {
    id: serial('id').primaryKey(),
    roleId: integer('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
    tableName: varchar('table_name', { length: 50 }).notNull(),
    canRead: boolean('can_read').default(false).notNull(),
    canCreate: boolean('can_create').default(false).notNull(),
    canUpdate: boolean('can_update').default(false).notNull(),
    canDelete: boolean('can_delete').default(false).notNull(),
    isActive: boolean('is_active').default(false).notNull(),
});

export type Role = InferSelectModel<typeof roles>;
export type UserRole = InferSelectModel<typeof userRoles>;
export type AccessRule = InferSelectModel<typeof accessRules>;

export const AVAILABLE_APP_TABLES = ['todos', 'organizations', 'users', 'roles'] as const;
export type AppTableName = typeof AVAILABLE_APP_TABLES[number];

export const changelogs = pgTable('changelogs', {
    id: serial('id').primaryKey(),
    tableName: varchar('table_name', { length: 50 }).notNull(),
    recordId: varchar('record_id', { length: 50 }).notNull(),
    userId: uuid('user_id').notNull().references(() => profiles.id, { onDelete: 'cascade' }),
    action: varchar('action', { length: 20 }).notNull(),
    changes: jsonb('changes').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Changelog = InferSelectModel<typeof changelogs>;