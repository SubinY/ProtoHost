import type { CreateVersionInput, ProjectVersion } from '../types.js'
import type { VersionRepo } from '../repos/versions.repo.js'
import { bumpId, readJson, withStoreLock, writeJson } from './store.js'

export function createJsonVersionRepo(): VersionRepo {
  return {
    async findLatestByProjectId(projectId) {
      const versions = await readJson<ProjectVersion[]>('versions.json', [])
      const rows = versions
        .filter((v) => v.projectId === projectId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      return rows[0] ?? null
    },

    async listDistinctByProjectId(projectId) {
      const versions = await readJson<ProjectVersion[]>('versions.json', [])
      const byNumber = new Map<string, ProjectVersion>()
      for (const v of versions) {
        if (v.projectId !== projectId) continue
        const existing = byNumber.get(v.versionNumber)
        if (!existing || v.id > existing.id) {
          byNumber.set(v.versionNumber, v)
        }
      }
      return Array.from(byNumber.values()).sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )
    },

    async findById(versionId) {
      const versions = await readJson<ProjectVersion[]>('versions.json', [])
      return versions.find((v) => v.id === versionId) ?? null
    },

    async listByProjectId(projectId) {
      const versions = await readJson<ProjectVersion[]>('versions.json', [])
      return versions.filter((v) => v.projectId === projectId)
    },

    async create(values) {
      return withStoreLock(async () => {
        const versions = await readJson<ProjectVersion[]>('versions.json', [])
        const version: ProjectVersion = {
          id: await bumpId('nextVersionId'),
          projectId: values.projectId,
          versionNumber: values.versionNumber,
          changelog: values.changelog,
          storagePath: values.storagePath,
          fileSize: values.fileSize,
          createdAt: new Date(),
        }
        versions.push(version)
        await writeJson('versions.json', versions)
        return version
      })
    },

    async deleteByProjectId(projectId) {
      await withStoreLock(async () => {
        const versions = await readJson<ProjectVersion[]>('versions.json', [])
        const remaining = versions.filter((v) => v.projectId !== projectId)
        if (remaining.length !== versions.length) {
          await writeJson('versions.json', remaining)
        }
      })
    },
  }
}
