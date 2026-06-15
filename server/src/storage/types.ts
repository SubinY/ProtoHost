export type UserRole = 'admin' | 'user'

export interface User {
  id: number
  email: string
  passwordHash: string
  role: UserRole
  enabled: boolean
  createdAt: Date
}

export interface CreateUserInput {
  email: string
  passwordHash: string
  role?: UserRole
  enabled?: boolean
}

export interface UpdateUserInput {
  email?: string
  passwordHash?: string
  enabled?: boolean
  role?: UserRole
}

export interface ProjectGroup {
  id: number
  userId: number
  name: string
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface Project {
  id: number
  userId: number
  groupId: number | null
  name: string
  version: string
  description: string | null
  isPublic: boolean
  accessPasswordHash: string | null
  shareSlug: string
  entryFile: string
  storagePath: string
  viewCount: number
  lastUpdatedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface ProjectVersion {
  id: number
  projectId: number
  versionNumber: string
  changelog: string | null
  storagePath: string
  fileSize: number
  createdAt: Date
}

export interface CreateProjectInput {
  userId: number
  name: string
  version: string
  description: string | null
  isPublic: boolean
  accessPasswordHash: string | null
  shareSlug: string
  entryFile: string
  storagePath: string
  groupId: number | null
  viewCount?: number
  lastUpdatedAt?: Date | null
}

export interface UpdateProjectInput {
  name?: string
  version?: string
  description?: string | null
  isPublic?: boolean
  accessPasswordHash?: string | null
  storagePath?: string
  entryFile?: string
  groupId?: number | null
  lastUpdatedAt?: Date | null
  updatedAt?: Date
}

export interface CreateVersionInput {
  projectId: number
  versionNumber: string
  changelog: string | null
  storagePath: string
  fileSize: number
}
