import type { Context, Next } from 'koa'
import { getUserIdFromToken } from '../lib/jwt.js'

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

export async function requireAuth(ctx: Context, next: Next) {
  if (!ctx.state.userId) {
    ctx.status = 401
    ctx.body = { message: '未授权' }
    return
  }
  await next()
}
