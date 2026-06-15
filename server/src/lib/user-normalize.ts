import { env } from '../config/env.js'
import type { User, UserRole } from '../storage/types.js'

type UserLike = {
  id: number
  email: string
  passwordHash: string
  createdAt: Date
  role?: string | UserRole
  enabled?: boolean
}

export function normalizeUser(raw: UserLike): User {
  let role: UserRole = raw.role === 'admin' ? 'admin' : 'user'
  if (!raw.role && raw.email === env.DEFAULT_USER_EMAIL) {
    role = 'admin'
  }
  return {
    id: raw.id,
    email: raw.email,
    passwordHash: raw.passwordHash,
    role,
    enabled: raw.enabled !== false,
    createdAt: raw.createdAt,
  }
}

export function toUserDto(user: User) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    enabled: user.enabled,
    createdAt: user.createdAt,
  }
}
