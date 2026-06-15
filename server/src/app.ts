import Koa from 'koa'
import cors from '@koa/cors'
import { bodyParser } from '@koa/bodyparser'
import Router from '@koa/router'
import { corsOrigins } from './config/env.js'
import { errorHandler } from './middleware/error-handler.js'
import { loadUser, parseJwt, requireAdmin, requireAuth } from './middleware/auth.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { authProtectedRoutes } from './modules/auth/auth.protected.routes.js'
import { groupRoutes } from './modules/groups/group.routes.js'
import { projectRoutes } from './modules/projects/project.routes.js'
import { shareRoutes } from './modules/share/share.routes.js'
import { userRoutes } from './modules/users/users.routes.js'

export function createApp() {
  const app = new Koa()

  app.use(errorHandler)
  app.use(
    cors({
      origin: (ctx) => {
        const origin = ctx.get('Origin')
        if (!origin) return corsOrigins[0]
        return corsOrigins.includes(origin) ? origin : corsOrigins[0]
      },
      credentials: true,
    }),
  )
  app.use(bodyParser())
  app.use(parseJwt)
  app.use(loadUser)

  const api = new Router({ prefix: '/api' })

  api.get('/health', (ctx) => {
    ctx.body = { ok: true }
  })

  api.use(authRoutes.routes())
  api.use(authRoutes.allowedMethods())

  api.use(shareRoutes.routes())
  api.use(shareRoutes.allowedMethods())

  const protectedRouter = new Router()
  protectedRouter.use(requireAuth)
  protectedRouter.use(authProtectedRoutes.routes())
  protectedRouter.use(authProtectedRoutes.allowedMethods())
  protectedRouter.use(groupRoutes.routes())
  protectedRouter.use(groupRoutes.allowedMethods())
  protectedRouter.use(projectRoutes.routes())
  protectedRouter.use(projectRoutes.allowedMethods())

  const adminRouter = new Router()
  adminRouter.use(requireAdmin)
  adminRouter.use(userRoutes.routes())
  adminRouter.use(userRoutes.allowedMethods())
  protectedRouter.use(adminRouter.routes())
  protectedRouter.use(adminRouter.allowedMethods())

  api.use(protectedRouter.routes())
  api.use(protectedRouter.allowedMethods())

  app.use(api.routes())
  app.use(api.allowedMethods())

  return app
}
