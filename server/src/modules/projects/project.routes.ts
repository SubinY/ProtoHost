import Router from '@koa/router'
import multer from '@koa/multer'
import type { Context } from 'koa'
import { z } from 'zod'
import * as projectService from './project.service.js'
import { AppError } from '../../lib/errors.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024 },
})

const router = new Router({ prefix: '/projects' })

router.get('/versions/:versionId/download', async (ctx: Context) => {
  const { zipBuffer, filename } = await projectService.downloadVersion(
    ctx.state.userId!,
    Number(ctx.params.versionId),
  )
  ctx.set('Content-Type', 'application/zip')
  ctx.set('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${filename}`)
  ctx.body = zipBuffer
})

router.get('/', async (ctx: Context) => {
  const groupIdRaw = ctx.query.groupId
  const groupId =
    groupIdRaw === undefined || groupIdRaw === ''
      ? undefined
      : Number(groupIdRaw)
  ctx.body = await projectService.listByUser(ctx.state.userId!, groupId)
})

router.post('/upload', upload.single('file'), async (ctx: Context) => {
  const file = ctx.file
  if (!file) throw new AppError('请上传文件')

  const body = ctx.request.body as Record<string, string | undefined>
  const projectId = body.projectId ? Number(body.projectId) : undefined
  const name = body.name
  if (!name) throw new AppError('项目名称不能为空')

  ctx.body = await projectService.upload(ctx.state.userId!, file.buffer, {
    projectId,
    name,
    version: body.version,
    description: body.description,
    isPublic: body.isPublic === 'true' || body.isPublic === undefined,
    accessPassword: body.accessPassword,
    groupId: body.groupId ? Number(body.groupId) : undefined,
    isReplace: body.isReplace === 'true',
    changelog: body.changelog,
  })
})

router.delete('/:id', async (ctx: Context) => {
  await projectService.deleteProject(ctx.state.userId!, Number(ctx.params.id))
  ctx.status = 204
})

router.put('/:id/group', async (ctx: Context) => {
  const groupIdRaw = ctx.query.groupId
  const groupId =
    groupIdRaw === undefined || groupIdRaw === '' ? undefined : Number(groupIdRaw)
  await projectService.updateGroup(ctx.state.userId!, Number(ctx.params.id), groupId)
  ctx.status = 200
})

router.put('/:id/settings', async (ctx: Context) => {
  const isPublic = ctx.query.isPublic === 'true'
  const accessPassword = ctx.query.accessPassword as string | undefined
  await projectService.updateSettings(
    ctx.state.userId!,
    Number(ctx.params.id),
    isPublic,
    accessPassword,
  )
  ctx.status = 200
})

router.get('/:id/versions', async (ctx: Context) => {
  ctx.body = await projectService.listVersions(ctx.state.userId!, Number(ctx.params.id))
})

export const projectRoutes = router
