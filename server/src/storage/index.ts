import type { Storage } from './storage.js'
import { createPostgresUserRepo } from './postgres/users.repo.pg.js'
import { createPostgresGroupRepo } from './postgres/groups.repo.pg.js'
import { createPostgresProjectRepo } from './postgres/projects.repo.pg.js'
import { createPostgresVersionRepo } from './postgres/versions.repo.pg.js'
import { createJsonUserRepo } from './json/users.repo.json.js'
import { createJsonGroupRepo } from './json/groups.repo.json.js'
import { createJsonProjectRepo } from './json/projects.repo.json.js'
import { createJsonVersionRepo } from './json/versions.repo.json.js'

export function createStorage(): Storage {
  const driver = process.env.STORAGE_DRIVER === 'json' ? 'json' : 'postgres'
  if (driver === 'json') {
    return {
      users: createJsonUserRepo(),
      groups: createJsonGroupRepo(),
      projects: createJsonProjectRepo(),
      versions: createJsonVersionRepo(),
    }
  }

  return {
    users: createPostgresUserRepo(),
    groups: createPostgresGroupRepo(),
    projects: createPostgresProjectRepo(),
    versions: createPostgresVersionRepo(),
  }
}

export const storage = createStorage()

export type { Storage } from './storage.js'
export type {
  User,
  ProjectGroup,
  Project,
  ProjectVersion,
  CreateProjectInput,
  UpdateProjectInput,
  CreateVersionInput,
} from './types.js'
