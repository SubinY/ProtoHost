import type { CreateProjectInput, Project, UpdateProjectInput } from '../types.js'

export interface ProjectRepo {
  listByUserId(userId: number, groupId?: number | null): Promise<Project[]>
  findByIdAndUser(userId: number, projectId: number): Promise<Project | null>
  findByShareSlug(slug: string): Promise<Project | null>
  create(values: CreateProjectInput): Promise<Project>
  update(projectId: number, patch: UpdateProjectInput): Promise<Project>
  delete(projectId: number): Promise<void>
  incrementViewCount(projectId: number): Promise<number>
  clearGroupId(groupId: number): Promise<void>
}
