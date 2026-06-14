import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { users } from '../db/schema/index.js'
import { env } from '../config/env.js'
import { hashPassword } from './password.js'

export async function ensureDefaultUser() {
  if (!env.DEFAULT_USER_ENABLED) return

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, env.DEFAULT_USER_EMAIL))
    .limit(1)
  if (existing) return

  await db.insert(users).values({
    email: env.DEFAULT_USER_EMAIL,
    passwordHash: await hashPassword(env.DEFAULT_USER_PASSWORD),
  })
  console.info(`Default user created: ${env.DEFAULT_USER_EMAIL}`)
}
