import { storage } from '../../storage/index.js'
import type { ProjectGroup } from '../../storage/types.js'

export async function listByUser(userId: number) {
  const groups = await storage.groups.listByUserId(userId)

  return Promise.all(
    groups.map(async (g: ProjectGroup) => {
      const projectCount = await storage.groups.countProjects(g.id)
      return {
        id: g.id,
        name: g.name,
        sortOrder: Number(g.sortOrder),
        projectCount,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      }
    }),
  )
}

export async function create(userId: number, name: string) {
  const groups = await storage.groups.listByUserId(userId)
  const maxRow = groups.length > 0 ? groups[groups.length - 1] : null
  const sortOrder = maxRow ? Number(maxRow.sortOrder) + 1 : 0
  return storage.groups.create(userId, name, sortOrder)
}

export async function update(userId: number, groupId: number, name: string) {
  await storage.groups.update(userId, groupId, name)
}

export async function remove(userId: number, groupId: number) {
  await storage.groups.delete(userId, groupId)
}

export async function updateSortOrder(userId: number, groupIds: number[]) {
  await storage.groups.updateSortOrder(userId, groupIds)
}
