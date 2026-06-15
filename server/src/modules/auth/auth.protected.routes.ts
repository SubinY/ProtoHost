import Router from '@koa/router'
import type { Context } from 'koa'
import { z } from 'zod'
import * as authService from '../auth/auth.service.js'

const router = new Router({ prefix: '/auth' })

const passwordBody = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(6),
})

router.get('/me', async (ctx: Context) => {
  ctx.body = await authService.me(ctx.state.userId!)
})

router.put('/password', async (ctx: Context) => {
  const body = passwordBody.parse(ctx.request.body)
  await authService.changePassword(ctx.state.userId!, body.oldPassword, body.newPassword)
  ctx.body = { ok: true }
})

export const authProtectedRoutes = router
