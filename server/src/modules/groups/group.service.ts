import { and, asc, count, desc, eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { projectGroups, projects } from '../../db/schema/index.js'
import { AppError } from '../../lib/errors.js'

export async function listByUser(userId: number) {
  const groups = await db
    .select()
    .from(projectGroups)
    .where(eq(projectGroups.userId, userId))
    .orderBy(asc(projectGroups.sortOrder))

  return Promise.all(
    groups.map(async (g) => {
      const [row] = await db
        .select({ count: count() })
        .from(projects)
        .where(eq(projects.groupId, g.id))
      return {
        id: g.id,
        name: g.name,
        sortOrder: Number(g.sortOrder),
        projectCount: row?.count ?? 0,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      }
    }),
  )
}

export async function create(userId: number, name: string) {
  const [maxRow] = await db
    .select()
    .from(projectGroups)
    .where(eq(projectGroups.userId, userId))
    .orderBy(desc(projectGroups.sortOrder))
    .limit(1)

  const sortOrder = maxRow ? Number(maxRow.sortOrder) + 1 : 0
  const [group] = await db
    .insert(projectGroups)
    .values({ userId, name, sortOrder })
    .returning()
  return group
}

export async function update(userId: number, groupId: number, name: string) {
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
}

export async function remove(userId: number, groupId: number) {
  const [existing] = await db
    .select()
    .from(projectGroups)
    .where(and(eq(projectGroups.id, groupId), eq(projectGroups.userId, userId)))
    .limit(1)
  if (!existing) return

  await db.update(projects).set({ groupId: null }).where(eq(projects.groupId, groupId))
  await db.delete(projectGroups).where(eq(projectGroups.id, groupId))
}

export async function updateSortOrder(userId: number, groupIds: number[]) {
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
}
