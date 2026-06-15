import Router from '@koa/router'
import type { Context } from 'koa'
import { z } from 'zod'
import * as authService from './auth.service.js'

const router = new Router({ prefix: '/auth' })

const emailSchema = z.string().min(3)
const loginBody = z.object({
  email: emailSchema,
  password: z.string().min(1),
})

router.post('/send-register-code', async (ctx: Context) => {
  ctx.status = 403
  ctx.body = { message: '已关闭公开注册' }
})

router.post('/send-reset-code', async (ctx: Context) => {
  ctx.status = 403
  ctx.body = { message: '请联系管理员重置密码' }
})

router.post('/reset-password', async (ctx: Context) => {
  ctx.status = 403
  ctx.body = { message: '请联系管理员重置密码' }
})

router.post('/register', async (ctx: Context) => {
  ctx.status = 403
  ctx.body = { message: '已关闭公开注册' }
})

router.post('/login', async (ctx: Context) => {
  const body = loginBody.parse(ctx.request.body)
  ctx.body = await authService.login(body.email, body.password)
})

export const authRoutes = router
