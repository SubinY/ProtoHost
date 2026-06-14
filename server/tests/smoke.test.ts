import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import AdmZip from 'adm-zip'
import fs from 'fs/promises'
import path from 'path'
import { createApp } from '../src/app.js'
import { ensureDefaultUser } from '../src/lib/seed-default-user.js'
import { env } from '../src/config/env.js'
import { injectHtml } from '../src/modules/share/axure-injector.js'

function makeZipHtml(html = '<html><head></head><body>smoke</body></html>'): Buffer {
  const zip = new AdmZip()
  zip.addFile('index.html', Buffer.from(html, 'utf-8'))
  return zip.toBuffer()
}

describe('ProtoHost server smoke', () => {
  const app = createApp()
  let token = ''
  let projectId = 0
  let versionId = 0
  let shareSlug = ''
  let groupId = 0

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL required — copy server/.env.example and run db:push')
    }
    await fs.mkdir(env.UPLOAD_BASE_PATH, { recursive: true })
    await ensureDefaultUser()
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
    expect(res.body.email).toBe(env.DEFAULT_USER_EMAIL)
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

    await request(app.callback())
      .put(`/api/groups/${groupId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Smoke Group Updated' })
      .expect(200)

    await request(app.callback())
      .put('/api/groups/sort')
      .set('Authorization', `Bearer ${token}`)
      .send([groupId])
      .expect(200)
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
    expect(res.body.name).toBe('Smoke Project')
    expect(res.body.shareSlug).toBeTruthy()
    projectId = res.body.id
    shareSlug = res.body.shareSlug
  })

  it('GET /api/projects list', async () => {
    const res = await request(app.callback())
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.some((p: { id: number }) => p.id === projectId)).toBe(true)
  })

  it('GET /api/projects/:id/versions', async () => {
    const res = await request(app.callback())
      .get(`/api/projects/${projectId}/versions`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.length).toBeGreaterThan(0)
    versionId = res.body[0].id
  })

  it('GET /api/projects/versions/:id/download', async () => {
    const res = await request(app.callback())
      .get(`/api/projects/versions/${versionId}/download`)
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('application/zip')
    const size = Number(res.headers['content-length'] ?? 0)
    expect(size).toBeGreaterThan(0)
  })

  it('PUT project settings + move group', async () => {
    await request(app.callback())
      .put(`/api/projects/${projectId}/settings`)
      .set('Authorization', `Bearer ${token}`)
      .query({ isPublic: 'false', accessPassword: 'secret123' })
      .expect(200)

    await request(app.callback())
      .put(`/api/projects/${projectId}/group`)
      .set('Authorization', `Bearer ${token}`)
      .query({ groupId: '0' })
      .expect(200)
  })

  it('share meta + verify + static file', async () => {
    const meta = await request(app.callback()).get(`/api/share/${shareSlug}/meta`)
    expect(meta.status).toBe(200)
    expect(meta.body.isPublic).toBe(false)

    const bad = await request(app.callback()).post(`/api/share/${shareSlug}/verify`).send({ password: 'wrong' })
    expect(bad.status).toBe(401)

    const verify = await request(app.callback())
      .post(`/api/share/${shareSlug}/verify`)
      .send({ password: 'secret123' })
    expect(verify.status).toBe(200)
    expect(verify.body.viewToken).toBeTruthy()

    const file = await request(app.callback())
      .get(`/api/share/${shareSlug}/files/index.html`)
      .query({ viewToken: verify.body.viewToken })
    expect(file.status).toBe(200)
    expect(file.text).toContain('viewToken')
    expect(file.text).toContain('smoke')
  })

  it('axure injectHtml inserts script before </head>', () => {
    const out = injectHtml('<html><head></head><body></body></html>', 'test-token')
    expect(out).toContain('<script>(function(){')
    expect(out).toContain('test-token')
    expect(out.indexOf('<script>')).toBeLessThan(out.indexOf('</head>'))
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

  it('rejects unauthenticated projects', async () => {
    await request(app.callback()).get('/api/projects').expect(401)
  })
})
