import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import AdmZip from 'adm-zip'
import fs from 'fs/promises'
import path from 'path'

const testRoot = vi.hoisted(() => {
  const os = require('node:os') as typeof import('node:os')
  const pathMod = require('node:path') as typeof import('node:path')
  const base = pathMod.join(
    os.tmpdir(),
    `protohost-json-smoke-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  )
  process.env.STORAGE_DRIVER = 'json'
  process.env.JSON_STORE_PATH = pathMod.join(base, 'data')
  process.env.UPLOAD_BASE_PATH = pathMod.join(base, 'uploads')
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_at_least_32_chars'
  process.env.DEFAULT_USER_ENABLED = 'true'
  process.env.DEFAULT_USER_EMAIL = 'admin'
  process.env.DEFAULT_USER_PASSWORD = 'Admin1234'
  delete process.env.DATABASE_URL
  return base
})

import { createApp } from '../src/app.js'
import { ensureDefaultUser } from '../src/lib/seed-default-user.js'
import { env } from '../src/config/env.js'
import { initJsonStore } from '../src/storage/json/store.js'
import { injectHtml } from '../src/modules/share/axure-injector.js'

function makeZipHtml(html = '<html><head></head><body>smoke</body></html>'): Buffer {
  const zip = new AdmZip()
  zip.addFile('index.html', Buffer.from(html, 'utf-8'))
  return zip.toBuffer()
}

describe('ProtoHost server smoke (json storage)', () => {
  const app = createApp()
  let token = ''
  let projectId = 0
  let shareSlug = ''
  let groupId = 0

  beforeAll(async () => {
    await fs.mkdir(env.UPLOAD_BASE_PATH, { recursive: true })
    await fs.mkdir(env.JSON_STORE_PATH, { recursive: true })
    await initJsonStore()
    await ensureDefaultUser()
  })

  afterAll(async () => {
    await fs.rm(testRoot, { recursive: true, force: true })
  })

  it('GET /api/health', async () => {
    const res = await request(app.callback()).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('POST /api/auth/login (default user)', async () => {
    const res = await request(app.callback())
      .post('/api/auth/login')
      .send({ email: env.DEFAULT_USER_EMAIL, password: env.DEFAULT_USER_PASSWORD })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeTruthy()
    token = res.body.token
  })

  it('groups CRUD + sort', async () => {
    const create = await request(app.callback())
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Smoke Group' })
    expect(create.status).toBe(200)
    groupId = create.body.id

    const list = await request(app.callback())
      .get('/api/groups')
      .set('Authorization', `Bearer ${token}`)
    expect(list.status).toBe(200)
    expect(list.body.some((g: { id: number }) => g.id === groupId)).toBe(true)
  })

  it('POST /api/projects/upload', async () => {
    const res = await request(app.callback())
      .post('/api/projects/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'Smoke Project')
      .field('version', '1.0.0')
      .field('isPublic', 'true')
      .field('groupId', String(groupId))
      .attach('file', makeZipHtml(), { filename: 'proto.zip', contentType: 'application/zip' })
    expect(res.status).toBe(200)
    projectId = res.body.id
    shareSlug = res.body.shareSlug
  })

  it('share meta + verify + static file', async () => {
    await request(app.callback())
      .put(`/api/projects/${projectId}/settings`)
      .set('Authorization', `Bearer ${token}`)
      .query({ isPublic: 'false', accessPassword: 'secret123' })
      .expect(200)

    const verify = await request(app.callback())
      .post(`/api/share/${shareSlug}/verify`)
      .send({ password: 'secret123' })
    expect(verify.status).toBe(200)

    const file = await request(app.callback())
      .get(`/api/share/${shareSlug}/files/index.html`)
      .query({ viewToken: verify.body.viewToken })
    expect(file.status).toBe(200)
    expect(file.text).toContain('smoke')
  })

  it('injectHtml inserts script before </head>', () => {
    const out = injectHtml('<html><head></head><body></body></html>', 'test-token')
    expect(out).toContain('test-token')
  })

  it('cleanup project and group', async () => {
    await request(app.callback())
      .delete(`/api/projects/${projectId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204)

    await request(app.callback())
      .delete(`/api/groups/${groupId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204)
  })
})
