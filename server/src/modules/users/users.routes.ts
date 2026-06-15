import Router from '@koa/router'
import type { Context } from 'koa'
import { z } from 'zod'
import * as usersService from './users.service.js'

const router = new Router({ prefix: '/users' })

const createBody = z.object({
  email: z.string().min(3),
  password: z.string().min(6),
})

const updateBody = z.object({
  email: z.string().min(3).optional(),
  password: z.string().min(6).optional(),
  enabled: z.boolean().optional(),
})

const enabledBody = z.object({
  enabled: z.boolean(),
})

router.get('/', async (ctx: Context) => {
  ctx.body = await usersService.listUsers()
})

router.post('/', async (ctx: Context) => {
  const body = createBody.parse(ctx.request.body)
  ctx.body = await usersService.createUser(body.email, body.password)
})

router.put('/:id', async (ctx: Context) => {
  const id = Number(ctx.params.id)
  const body = updateBody.parse(ctx.request.body)
  ctx.body = await usersService.updateUser(id, body)
})

router.patch('/:id/enabled', async (ctx: Context) => {
  const id = Number(ctx.params.id)
  const body = enabledBody.parse(ctx.request.body)
  ctx.body = await usersService.setUserEnabled(id, body.enabled)
})

router.delete('/:id', async (ctx: Context) => {
  const id = Number(ctx.params.id)
  await usersService.deleteUser(id)
  ctx.status = 204
})

export const userRoutes = router
