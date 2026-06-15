import type { User } from '../types.js'
import type { UserRepo } from '../repos/users.repo.js'
import { normalizeUser } from '../../lib/user-normalize.js'
import { bumpId, readJson, withStoreLock, writeJson } from './store.js'

function normalizeUsers(raw: User[]): User[] {
  return raw.map((u) => normalizeUser(u))
}

export function createJsonUserRepo(): UserRepo {
  return {
    async findByEmail(email) {
      const users = normalizeUsers(await readJson<User[]>('users.json', []))
      return users.find((u) => u.email === email) ?? null
    },

    async findById(id) {
      const users = normalizeUsers(await readJson<User[]>('users.json', []))
      return users.find((u) => u.id === id) ?? null
    },

    async list() {
      return normalizeUsers(await readJson<User[]>('users.json', []))
    },

    async create(email, passwordHash) {
      return this.createAccount({ email, passwordHash, role: 'user', enabled: true })
    },

    async createAccount(input) {
      return withStoreLock(async () => {
        const users = normalizeUsers(await readJson<User[]>('users.json', []))
        const user: User = normalizeUser({
          id: await bumpId('nextUserId'),
          email: input.email,
          passwordHash: input.passwordHash,
          role: input.role ?? 'user',
          enabled: input.enabled ?? true,
          createdAt: new Date(),
        })
        users.push(user)
        await writeJson('users.json', users)
        return user
      })
    },

    async updatePassword(userId, passwordHash) {
      await withStoreLock(async () => {
        const users = normalizeUsers(await readJson<User[]>('users.json', []))
        const idx = users.findIndex((u) => u.id === userId)
        if (idx === -1) return
        users[idx] = { ...users[idx], passwordHash }
        await writeJson('users.json', users)
      })
    },

    async updateAccount(id, patch) {
      return withStoreLock(async () => {
        const users = normalizeUsers(await readJson<User[]>('users.json', []))
        const idx = users.findIndex((u) => u.id === id)
        if (idx === -1) throw new Error('user not found')
        users[idx] = normalizeUser({ ...users[idx], ...patch })
        await writeJson('users.json', users)
        return users[idx]
      })
    },

    async delete(id) {
      await withStoreLock(async () => {
        const users = normalizeUsers(await readJson<User[]>('users.json', []))
        const remaining = users.filter((u) => u.id !== id)
        if (remaining.length === users.length) return
        await writeJson('users.json', remaining)
      })
    },
  }
}
