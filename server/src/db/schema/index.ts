import {
  bigint,
  boolean,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const projectGroups = pgTable('project_groups', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  sortOrder: bigint('sort_order', { mode: 'number' }).notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const projects = pgTable('projects', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  groupId: bigint('group_id', { mode: 'number' }).references(() => projectGroups.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 100 }).notNull(),
  version: varchar('version', { length: 20 }).notNull().default('1.0.0'),
  description: varchar('description', { length: 500 }),
  isPublic: boolean('is_public').notNull().default(true),
  accessPasswordHash: varchar('access_password_hash', { length: 255 }),
  shareSlug: varchar('share_slug', { length: 32 }).notNull().unique(),
  entryFile: varchar('entry_file', { length: 255 }).notNull().default('index.html'),
  storagePath: varchar('storage_path', { length: 500 }).notNull(),
  viewCount: bigint('view_count', { mode: 'number' }).notNull().default(0),
  lastUpdatedAt: timestamp('last_updated_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const projectVersions = pgTable('project_versions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  projectId: bigint('project_id', { mode: 'number' }).notNull().references(() => projects.id, { onDelete: 'cascade' }),
  versionNumber: varchar('version_number', { length: 20 }).notNull(),
  changelog: text('changelog'),
  storagePath: varchar('storage_path', { length: 500 }).notNull(),
  fileSize: bigint('file_size', { mode: 'number' }).notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
