import type { ProjectGroup } from '../types.js'

export interface GroupRepo {
  listByUserId(userId: number): Promise<ProjectGroup[]>
  create(userId: number, name: string, sortOrder: number): Promise<ProjectGroup>
  update(userId: number, groupId: number, name: string): Promise<void>
  delete(userId: number, groupId: number): Promise<void>
  updateSortOrder(userId: number, groupIds: number[]): Promise<void>
  countProjects(groupId: number): Promise<number>
}
