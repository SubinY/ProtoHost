import Router from '@koa/router'
import type { Context } from 'koa'
import { z } from 'zod'
import * as groupService from './group.service.js'

const router = new Router({ prefix: '/groups' })

router.get('/', async (ctx: Context) => {
  ctx.body = await groupService.listByUser(ctx.state.userId!)
})

router.post('/', async (ctx: Context) => {
  const body = z.object({ name: z.string().min(1) }).parse(ctx.request.body)
  ctx.body = await groupService.create(ctx.state.userId!, body.name)
})

router.put('/sort', async (ctx: Context) => {
  const ids = z.array(z.number()).parse(ctx.request.body)
  await groupService.updateSortOrder(ctx.state.userId!, ids)
  ctx.status = 200
})

router.put('/:id', async (ctx: Context) => {
  const id = Number(ctx.params.id)
  const body = z.object({ name: z.string().min(1) }).parse(ctx.request.body)
  await groupService.update(ctx.state.userId!, id, body.name)
  ctx.status = 200
})

router.delete('/:id', async (ctx: Context) => {
  const id = Number(ctx.params.id)
  await groupService.remove(ctx.state.userId!, id)
  ctx.status = 204
})

export const groupRoutes = router
