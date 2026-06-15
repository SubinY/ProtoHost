import { and, desc, eq, isNull } from 'drizzle-orm'
import { getDb } from '../../db/index.js'
import { projects } from '../../db/schema/index.js'
import type { ProjectRepo } from '../repos/projects.repo.js'

export function createPostgresProjectRepo(): ProjectRepo {
  return {
    async listByUserId(userId, groupId) {
      const db = getDb()
      if (groupId != null && groupId !== undefined) {
        if (groupId === 0) {
          return db
            .select()
            .from(projects)
            .where(and(eq(projects.userId, userId), isNull(projects.groupId)))
            .orderBy(desc(projects.updatedAt))
        }
        return db
          .select()
          .from(projects)
          .where(and(eq(projects.userId, userId), eq(projects.groupId, groupId)))
          .orderBy(desc(projects.updatedAt))
      }
      return db
        .select()
        .from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(desc(projects.updatedAt))
    },

    async findByIdAndUser(userId, projectId) {
      const db = getDb()
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
        .limit(1)
      return project ?? null
    },

    async findByShareSlug(slug) {
      const db = getDb()
      const [project] = await db.select().from(projects).where(eq(projects.shareSlug, slug)).limit(1)
      return project ?? null
    },

    async create(values) {
      const db = getDb()
      const [project] = await db
        .insert(projects)
        .values({
          userId: values.userId,
          name: values.name,
          version: values.version,
          description: values.description,
          isPublic: values.isPublic,
          accessPasswordHash: values.accessPasswordHash,
          shareSlug: values.shareSlug,
          entryFile: values.entryFile,
          storagePath: values.storagePath,
          groupId: values.groupId,
          viewCount: values.viewCount ?? 0,
          lastUpdatedAt: values.lastUpdatedAt ?? new Date(),
        })
        .returning()
      return project
    },

    async update(projectId, patch) {
      const db = getDb()
      const [project] = await db
        .update(projects)
        .set(patch)
        .where(eq(projects.id, projectId))
        .returning()
      return project
    },

    async delete(projectId) {
      const db = getDb()
      await db.delete(projects).where(eq(projects.id, projectId))
    },

    async incrementViewCount(projectId) {
      const db = getDb()
      const [p] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
      if (!p) throw new Error('project not found')
      const viewCount = Number(p.viewCount) + 1
      await db.update(projects).set({ viewCount }).where(eq(projects.id, projectId))
      return viewCount
    },

    async clearGroupId(groupId) {
      const db = getDb()
      await db.update(projects).set({ groupId: null }).where(eq(projects.groupId, groupId))
    },
  }
}
