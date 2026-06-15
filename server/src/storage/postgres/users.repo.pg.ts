import { eq } from 'drizzle-orm'
import { getDb } from '../../db/index.js'
import { users } from '../../db/schema/index.js'
import { normalizeUser } from '../../lib/user-normalize.js'
import type { UserRepo } from '../repos/users.repo.js'

export function createPostgresUserRepo(): UserRepo {
  return {
    async findByEmail(email) {
      const db = getDb()
      const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)
      return user ? normalizeUser(user) : null
    },

    async findById(id) {
      const db = getDb()
      const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
      return user ? normalizeUser(user) : null
    },

    async list() {
      const db = getDb()
      const rows = await db.select().from(users)
      return rows.map(normalizeUser)
    },

    async create(email, passwordHash) {
      return this.createAccount({ email, passwordHash, role: 'user', enabled: true })
    },

    async createAccount(input) {
      const db = getDb()
      const [user] = await db
        .insert(users)
        .values({
          email: input.email,
          passwordHash: input.passwordHash,
          role: input.role ?? 'user',
          enabled: input.enabled ?? true,
        })
        .returning()
      return normalizeUser(user)
    },

    async updatePassword(userId, passwordHash) {
      const db = getDb()
      await db.update(users).set({ passwordHash }).where(eq(users.id, userId))
    },

    async updateAccount(id, patch) {
      const db = getDb()
      const [user] = await db.update(users).set(patch).where(eq(users.id, id)).returning()
      return normalizeUser(user)
    },

    async delete(id) {
      const db = getDb()
      await db.delete(users).where(eq(users.id, id))
    },
  }
}
