import type { Context, Next } from 'koa'
import { ZodError } from 'zod'
import { AppError, isAppError } from '../lib/errors.js'

export async function errorHandler(ctx: Context, next: Next) {
  try {
    await next()
  } catch (err) {
    if (err instanceof ZodError) {
      ctx.status = 400
      ctx.body = { message: err.errors[0]?.message ?? '参数错误' }
      return
    }
    if (isAppError(err)) {
      ctx.status = err.status
      ctx.body = { message: err.message }
      return
    }
    if (err instanceof Error && 'code' in err && err.message.includes('ENOENT')) {
      ctx.status = 400
      ctx.body = { message: `文件处理失败: ${err.message}` }
      return
    }
    console.error(err)
    ctx.status = 500
    ctx.body = { message: '服务器内部错误' }
  }
}
