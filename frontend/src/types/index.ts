export interface Project {
  id: number
  groupId?: number
  name: string
  version: string
  description?: string
  isPublic: boolean
  shareSlug: string
  entryFile: string
  viewCount: number
  fileSize: number
  lastUpdatedAt: string
  createdAt: string
  updatedAt: string
}

export interface ProjectGroup {
  id: number
  name: string
  sortOrder: number
  projectCount: number
  createdAt: string
  updatedAt: string
}

export interface ManagedUser {
  id: number
  email: string
  role: 'admin' | 'user'
  enabled: boolean
  createdAt: string
}
