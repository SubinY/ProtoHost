import type { UserRepo } from './repos/users.repo.js'
import type { GroupRepo } from './repos/groups.repo.js'
import type { ProjectRepo } from './repos/projects.repo.js'
import type { VersionRepo } from './repos/versions.repo.js'

export interface Storage {
  users: UserRepo
  groups: GroupRepo
  projects: ProjectRepo
  versions: VersionRepo
}
