import type { CreateProjectInput, Project, UpdateProjectInput } from '../types.js'
import type { ProjectRepo } from '../repos/projects.repo.js'
import { bumpId, readJson, withStoreLock, writeJson } from './store.js'

export function createJsonProjectRepo(): ProjectRepo {
  return {
    async listByUserId(userId, groupId) {
      const projects = await readJson<Project[]>('projects.json', [])
      let rows = projects.filter((p) => p.userId === userId)

      if (groupId != null && groupId !== undefined) {
        if (groupId === 0) {
          rows = rows.filter((p) => p.groupId == null)
        } else {
          rows = rows.filter((p) => p.groupId === groupId)
        }
      }

      return rows.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    },

    async findByIdAndUser(userId, projectId) {
      const projects = await readJson<Project[]>('projects.json', [])
      return projects.find((p) => p.id === projectId && p.userId === userId) ?? null
    },

    async findByShareSlug(slug) {
      const projects = await readJson<Project[]>('projects.json', [])
      return projects.find((p) => p.shareSlug === slug) ?? null
    },

    async create(values) {
      return withStoreLock(async () => {
        const projects = await readJson<Project[]>('projects.json', [])
        const now = new Date()
        const project: Project = {
          id: await bumpId('nextProjectId'),
          userId: values.userId,
          groupId: values.groupId,
          name: values.name,
          version: values.version,
          description: values.description,
          isPublic: values.isPublic,
          accessPasswordHash: values.accessPasswordHash,
          shareSlug: values.shareSlug,
          entryFile: values.entryFile,
          storagePath: values.storagePath,
          viewCount: values.viewCount ?? 0,
          lastUpdatedAt: values.lastUpdatedAt ?? now,
          createdAt: now,
          updatedAt: now,
        }
        projects.push(project)
        await writeJson('projects.json', projects)
        return project
      })
    },

    async update(projectId, patch) {
      return withStoreLock(async () => {
        const projects = await readJson<Project[]>('projects.json', [])
        const idx = projects.findIndex((p) => p.id === projectId)
        if (idx === -1) throw new Error('project not found')
        projects[idx] = { ...projects[idx], ...patch, updatedAt: patch.updatedAt ?? new Date() }
        await writeJson('projects.json', projects)
        return projects[idx]
      })
    },

    async delete(projectId) {
      await withStoreLock(async () => {
        const projects = await readJson<Project[]>('projects.json', [])
        const idx = projects.findIndex((p) => p.id === projectId)
        if (idx === -1) return
        projects.splice(idx, 1)
        await writeJson('projects.json', projects)

        const versions = await readJson<import('../types.js').ProjectVersion[]>('versions.json', [])
        const remaining = versions.filter((v) => v.projectId !== projectId)
        if (remaining.length !== versions.length) {
          await writeJson('versions.json', remaining)
        }
      })
    },

    async incrementViewCount(projectId) {
      return withStoreLock(async () => {
        const projects = await readJson<Project[]>('projects.json', [])
        const idx = projects.findIndex((p) => p.id === projectId)
        if (idx === -1) throw new Error('project not found')
        const viewCount = projects[idx].viewCount + 1
        projects[idx] = { ...projects[idx], viewCount }
        await writeJson('projects.json', projects)
        return viewCount
      })
    },

    async clearGroupId(groupId) {
      await withStoreLock(async () => {
        const projects = await readJson<Project[]>('projects.json', [])
        const now = new Date()
        let changed = false
        for (let i = 0; i < projects.length; i++) {
          if (projects[i].groupId === groupId) {
            projects[i] = { ...projects[i], groupId: null, updatedAt: now }
            changed = true
          }
        }
        if (changed) await writeJson('projects.json', projects)
      })
    },
  }
}
