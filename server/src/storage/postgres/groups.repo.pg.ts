import { and, asc, count, desc, eq } from 'drizzle-orm'
import { getDb } from '../../db/index.js'
import { projectGroups, projects } from '../../db/schema/index.js'
import type { GroupRepo } from '../repos/groups.repo.js'

export function createPostgresGroupRepo(): GroupRepo {
  return {
    async listByUserId(userId) {
      const db = getDb()
      return db
        .select()
        .from(projectGroups)
        .where(eq(projectGroups.userId, userId))
        .orderBy(asc(projectGroups.sortOrder))
    },

    async create(userId, name, sortOrder) {
      const db = getDb()
      const [group] = await db
        .insert(projectGroups)
        .values({ userId, name, sortOrder })
        .returning()
      return group
    },

    async update(userId, groupId, name) {
      const db = getDb()
      const [existing] = await db
        .select()
        .from(projectGroups)
        .where(and(eq(projectGroups.id, groupId), eq(projectGroups.userId, userId)))
        .limit(1)
      if (!existing) return
      await db
        .update(projectGroups)
        .set({ name, updatedAt: new Date() })
        .where(eq(projectGroups.id, groupId))
    },

    async delete(userId, groupId) {
      const db = getDb()
      const [existing] = await db
        .select()
        .from(projectGroups)
        .where(and(eq(projectGroups.id, groupId), eq(projectGroups.userId, userId)))
        .limit(1)
      if (!existing) return
      await db.update(projects).set({ groupId: null }).where(eq(projects.groupId, groupId))
      await db.delete(projectGroups).where(eq(projectGroups.id, groupId))
    },

    async updateSortOrder(userId, groupIds) {
      const db = getDb()
      for (let i = 0; i < groupIds.length; i++) {
        const id = groupIds[i]
        const [group] = await db
          .select()
          .from(projectGroups)
          .where(and(eq(projectGroups.id, id), eq(projectGroups.userId, userId)))
          .limit(1)
        if (!group) continue
        await db
          .update(projectGroups)
          .set({ sortOrder: i, updatedAt: new Date() })
          .where(eq(projectGroups.id, id))
      }
    },

    async countProjects(groupId) {
      const db = getDb()
      const [row] = await db
        .select({ count: count() })
        .from(projects)
        .where(eq(projects.groupId, groupId))
      return row?.count ?? 0
    },
  }
}
