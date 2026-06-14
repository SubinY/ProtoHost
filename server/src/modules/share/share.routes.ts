import Router from '@koa/router'
import fs from 'fs'
import type { Context } from 'koa'
import { z } from 'zod'
import * as shareService from './share.service.js'

const router = new Router({ prefix: '/share' })

router.get('/:slug/meta', async (ctx: Context) => {
  ctx.body = await shareService.getMeta(ctx.params.slug)
})

router.post('/:slug/verify', async (ctx: Context) => {
  const body = z.object({ password: z.string().optional() }).parse(ctx.request.body)
  ctx.body = await shareService.verify(ctx.params.slug, body.password)
})

router.get('/:slug/files/:path(.*)', async (ctx: Context) => {
  const subPath = (ctx.params.path as string) ?? ''
  const viewToken = ctx.query.viewToken as string | undefined
  const result = await shareService.serveFile(ctx.params.slug, subPath, viewToken)

  if (result.type === 'empty') {
    ctx.status = result.status
    return
  }

  if (result.type === 'body') {
    ctx.type = result.contentType
    ctx.body = result.body
    return
  }

  ctx.type = result.contentType
  ctx.body = fs.createReadStream(result.filePath)
})

export const shareRoutes = router
