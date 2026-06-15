import { storage } from '../storage/index.js'
import { env } from '../config/env.js'
import { hashPassword } from './password.js'

export async function ensureDefaultUser() {
  if (!env.DEFAULT_USER_ENABLED) return

  const existing = await storage.users.findByEmail(env.DEFAULT_USER_EMAIL)
  if (existing) {
    if (existing.email === env.DEFAULT_USER_EMAIL && existing.role !== 'admin') {
      await storage.users.updateAccount(existing.id, { role: 'admin', enabled: true })
    }
    return
  }

  await storage.users.createAccount({
    email: env.DEFAULT_USER_EMAIL,
    passwordHash: await hashPassword(env.DEFAULT_USER_PASSWORD),
    role: 'admin',
    enabled: true,
  })
  console.info(`Default user created: ${env.DEFAULT_USER_EMAIL}`)
}
