import type { Context, Next } from 'koa'
import { getUserIdFromToken } from '../lib/jwt.js'
import { storage } from '../storage/index.js'
import type { UserRole } from '../storage/types.js'

export async function parseJwt(ctx: Context, next: Next) {
  const header = ctx.get('Authorization')
  if (header?.startsWith('Bearer ')) {
    try {
      const token = header.slice(7)
      ctx.state.userId = await getUserIdFromToken(token)
    } catch {
      // invalid token — treat as unauthenticated
    }
  }
  await next()
}

export async function loadUser(ctx: Context, next: Next) {
  if (ctx.state.userId) {
    const user = await storage.users.findById(ctx.state.userId)
    if (user) {
      ctx.state.userEmail = user.email
      ctx.state.userRole = user.role as UserRole
      ctx.state.userEnabled = user.enabled
    }
  }
  await next()
}

export async function requireAuth(ctx: Context, next: Next) {
  if (!ctx.state.userId || ctx.state.userEnabled === false) {
    ctx.status = 401
    ctx.body = { message: ctx.state.userEnabled === false ? '账号已禁用' : '未授权' }
    return
  }
  await next()
}

export async function requireAdmin(ctx: Context, next: Next) {
  if (ctx.state.userRole !== 'admin') {
    ctx.status = 403
    ctx.body = { message: '权限不足' }
    return
  }
  await next()
}
