import type { CreateVersionInput, ProjectVersion } from '../types.js'

export interface VersionRepo {
  findLatestByProjectId(projectId: number): Promise<ProjectVersion | null>
  listDistinctByProjectId(projectId: number): Promise<ProjectVersion[]>
  findById(versionId: number): Promise<ProjectVersion | null>
  listByProjectId(projectId: number): Promise<ProjectVersion[]>
  create(values: CreateVersionInput): Promise<ProjectVersion>
  deleteByProjectId(projectId: number): Promise<void>
}
