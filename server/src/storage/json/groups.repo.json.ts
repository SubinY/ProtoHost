import type { ProjectGroup, Project } from '../types.js'
import type { GroupRepo } from '../repos/groups.repo.js'
import { bumpId, readJson, withStoreLock, writeJson } from './store.js'

export function createJsonGroupRepo(): GroupRepo {
  return {
    async listByUserId(userId) {
      const groups = await readJson<ProjectGroup[]>('groups.json', [])
      return groups
        .filter((g) => g.userId === userId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    },

    async create(userId, name, sortOrder) {
      return withStoreLock(async () => {
        const groups = await readJson<ProjectGroup[]>('groups.json', [])
        const now = new Date()
        const group: ProjectGroup = {
          id: await bumpId('nextGroupId'),
          userId,
          name,
          sortOrder,
          createdAt: now,
          updatedAt: now,
        }
        groups.push(group)
        await writeJson('groups.json', groups)
        return group
      })
    },

    async update(userId, groupId, name) {
      await withStoreLock(async () => {
        const groups = await readJson<ProjectGroup[]>('groups.json', [])
        const idx = groups.findIndex((g) => g.id === groupId && g.userId === userId)
        if (idx === -1) return
        groups[idx] = { ...groups[idx], name, updatedAt: new Date() }
        await writeJson('groups.json', groups)
      })
    },

    async delete(userId, groupId) {
      await withStoreLock(async () => {
        const groups = await readJson<ProjectGroup[]>('groups.json', [])
        const idx = groups.findIndex((g) => g.id === groupId && g.userId === userId)
        if (idx === -1) return

        const projects = await readJson<Project[]>('projects.json', [])
        for (let i = 0; i < projects.length; i++) {
          if (projects[i].groupId === groupId) {
            projects[i] = { ...projects[i], groupId: null, updatedAt: new Date() }
          }
        }

        groups.splice(idx, 1)
        await writeJson('projects.json', projects)
        await writeJson('groups.json', groups)
      })
    },

    async updateSortOrder(userId, groupIds) {
      await withStoreLock(async () => {
        const groups = await readJson<ProjectGroup[]>('groups.json', [])
        const now = new Date()
        for (let i = 0; i < groupIds.length; i++) {
          const id = groupIds[i]
          const idx = groups.findIndex((g) => g.id === id && g.userId === userId)
          if (idx === -1) continue
          groups[idx] = { ...groups[idx], sortOrder: i, updatedAt: now }
        }
        await writeJson('groups.json', groups)
      })
    },

    async countProjects(groupId) {
      const projects = await readJson<Project[]>('projects.json', [])
      return projects.filter((p) => p.groupId === groupId).length
    },
  }
}
