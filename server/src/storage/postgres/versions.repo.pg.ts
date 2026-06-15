import { desc, eq, inArray, max } from 'drizzle-orm'
import { getDb } from '../../db/index.js'
import { projectVersions } from '../../db/schema/index.js'
import type { VersionRepo } from '../repos/versions.repo.js'

export function createPostgresVersionRepo(): VersionRepo {
  return {
    async findLatestByProjectId(projectId) {
      const db = getDb()
      const [latest] = await db
        .select()
        .from(projectVersions)
        .where(eq(projectVersions.projectId, projectId))
        .orderBy(desc(projectVersions.createdAt))
        .limit(1)
      return latest ?? null
    },

    async listDistinctByProjectId(projectId) {
      const db = getDb()
      const maxIds = await db
        .select({ id: max(projectVersions.id) })
        .from(projectVersions)
        .where(eq(projectVersions.projectId, projectId))
        .groupBy(projectVersions.versionNumber)

      const ids = maxIds.map((r) => r.id).filter((id): id is number => id != null)
      if (ids.length === 0) return []

      return db
        .select()
        .from(projectVersions)
        .where(inArray(projectVersions.id, ids))
        .orderBy(desc(projectVersions.createdAt))
    },

    async findById(versionId) {
      const db = getDb()
      const [pv] = await db
        .select()
        .from(projectVersions)
        .where(eq(projectVersions.id, versionId))
        .limit(1)
      return pv ?? null
    },

    async listByProjectId(projectId) {
      const db = getDb()
      return db.select().from(projectVersions).where(eq(projectVersions.projectId, projectId))
    },

    async create(values) {
      const db = getDb()
      const [version] = await db.insert(projectVersions).values(values).returning()
      return version
    },

    async deleteByProjectId(projectId) {
      const db = getDb()
      await db.delete(projectVersions).where(eq(projectVersions.projectId, projectId))
    },
  }
}
