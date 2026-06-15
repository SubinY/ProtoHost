import fs from 'fs'
import path from 'path'
import { storage } from '../../storage/index.js'
import { env } from '../../config/env.js'
import { AppError } from '../../lib/errors.js'
import { generateViewToken, isViewToken } from '../../lib/jwt.js'
import { verifyPassword } from '../../lib/password.js'
import { readTextWithEncoding } from '../../lib/fs-utils.js'
import {
  detectContentType,
  injectAxplayerJs,
  injectDocJs,
  injectHtml,
} from './axure-injector.js'

export async function getMeta(slug: string) {
  const p = await storage.projects.findByShareSlug(slug)
  if (!p) throw new AppError('项目不存在')

  const viewCount = await storage.projects.incrementViewCount(p.id)

  return {
    name: p.name,
    version: p.version,
    isPublic: p.isPublic,
    entryFile: p.entryFile,
    viewCount,
  }
}

export async function verify(slug: string, password?: string) {
  const p = await storage.projects.findByShareSlug(slug)
  if (!p) throw new AppError('项目不存在')

  if (p.isPublic || !p.accessPasswordHash) {
    const viewToken = await generateViewToken(slug)
    return { viewToken }
  }

  if (!password || !(await verifyPassword(password, p.accessPasswordHash))) {
    throw new AppError('密码错误', 401)
  }

  const viewToken = await generateViewToken(slug)
  return { viewToken }
}

export type ServeFileResult =
  | { type: 'stream'; filePath: string; contentType: string }
  | { type: 'body'; body: string; contentType: string }
  | { type: 'empty'; status: number }

export async function serveFile(
  slug: string,
  subPath: string,
  viewToken?: string | null,
): Promise<ServeFileResult> {
  const p = await storage.projects.findByShareSlug(slug)
  if (!p) throw new AppError('项目不存在')

  const decodedPath = decodeURIComponent(subPath)

  if (!p.isPublic) {
    const isHtml = decodedPath.endsWith('.html') || decodedPath.endsWith('.htm')
    if (isHtml && (!viewToken || !(await isViewToken(viewToken, slug)))) {
      return { type: 'empty', status: 403 }
    }
  }

  const baseDir = await fs.promises.realpath(path.join(env.UPLOAD_BASE_PATH, p.storagePath))
  const target = path.resolve(baseDir, decodedPath)
  const targetCanonical = await fs.promises.realpath(target).catch(() => null)

  if (
    !targetCanonical ||
    (!targetCanonical.startsWith(baseDir + path.sep) && targetCanonical !== baseDir)
  ) {
    return { type: 'empty', status: 403 }
  }

  try {
    const stat = await fs.promises.stat(targetCanonical)
    if (!stat.isFile()) return { type: 'empty', status: 404 }
  } catch {
    return { type: 'empty', status: 404 }
  }

  if (
    !p.isPublic &&
    (viewToken || decodedPath.endsWith('axplayer.js') || decodedPath.endsWith('doc.js'))
  ) {
    if (decodedPath.endsWith('.html') || decodedPath.endsWith('.htm')) {
      const html = await readTextWithEncoding(targetCanonical)
      const body = injectHtml(html, viewToken)
      return { type: 'body', body, contentType: 'text/html; charset=utf-8' }
    }

    if (decodedPath.endsWith('axplayer.js')) {
      let vt = viewToken
      if (!vt) vt = await generateViewToken(slug)
      const js = await readTextWithEncoding(targetCanonical)
      const body = injectAxplayerJs(js, vt)
      return { type: 'body', body, contentType: 'application/javascript; charset=utf-8' }
    }

    if (decodedPath.endsWith('doc.js')) {
      let vt = viewToken
      if (!vt) vt = await generateViewToken(slug)
      const js = await readTextWithEncoding(targetCanonical)
      const body = injectDocJs(js, vt)
      return { type: 'body', body, contentType: 'application/javascript; charset=utf-8' }
    }
  }

  return {
    type: 'stream',
    filePath: targetCanonical,
    contentType: detectContentType(decodedPath),
  }
}
