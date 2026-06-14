import Router from '@koa/router'
import type { Context } from 'koa'
import { z } from 'zod'
import { AppError } from '../../lib/errors.js'
import * as authService from './auth.service.js'

const router = new Router({ prefix: '/auth' })

const emailSchema = z.string().min(3)
const authBody = z.object({
  email: emailSchema,
  password: z.string().min(1),
  code: z.string().optional(),
})

router.post('/send-register-code', async (ctx: Context) => {
  const email = emailSchema.parse(ctx.query.email)
  await authService.sendRegisterCode(email)
  ctx.body = '验证码已发送'
})

router.post('/send-reset-code', async (ctx: Context) => {
  const email = emailSchema.parse(ctx.query.email)
  await authService.sendResetCode(email)
  ctx.body = '验证码已发送'
})

router.post('/reset-password', async (ctx: Context) => {
  const body = authBody.parse(ctx.request.body)
  if (!body.code) throw new AppError('验证码不能为空')
  await authService.resetPassword(body.email, body.password, body.code)
  ctx.body = '密码已重置'
})

router.post('/register', async (ctx: Context) => {
  const body = authBody.parse(ctx.request.body)
  if (!body.code) throw new AppError('验证码不能为空')
  ctx.body = await authService.register(body.email, body.password, body.code)
})

router.post('/login', async (ctx: Context) => {
  const body = authBody.parse(ctx.request.body)
  ctx.body = await authService.login(body.email, body.password)
})

export const authRoutes = router
