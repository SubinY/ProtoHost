import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import request from 'supertest'
import fs from 'fs/promises'
import path from 'path'

const testRoot = vi.hoisted(() => {
  const os = require('node:os') as typeof import('node:os')
  const pathMod = require('node:path') as typeof import('node:path')
  const base = pathMod.join(
    os.tmpdir(),
    `protohost-users-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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

describe('User management (json storage)', () => {
  const app = createApp()
  let adminToken = ''
  let userToken = ''
  let userId = 0

  beforeAll(async () => {
    await fs.mkdir(env.UPLOAD_BASE_PATH, { recursive: true })
    await fs.mkdir(env.JSON_STORE_PATH, { recursive: true })
    await initJsonStore()
    await ensureDefaultUser()

    const login = await request(app.callback())
      .post('/api/auth/login')
      .send({ email: 'admin', password: 'Admin1234' })
    adminToken = login.body.token
  })

  afterAll(async () => {
    await fs.rm(testRoot, { recursive: true, force: true })
  })

  it('admin login returns role', async () => {
    const res = await request(app.callback())
      .post('/api/auth/login')
      .send({ email: 'admin', password: 'Admin1234' })
    expect(res.body.role).toBe('admin')
  })

  it('admin creates sub user', async () => {
    const res = await request(app.callback())
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email: 'member1', password: 'member1234' })
    expect(res.status).toBe(200)
    expect(res.body.email).toBe('member1')
    expect(res.body.role).toBe('user')
    userId = res.body.id
  })

  it('sub user can change password', async () => {
    const login = await request(app.callback())
      .post('/api/auth/login')
      .send({ email: 'member1', password: 'member1234' })
    userToken = login.body.token

    await request(app.callback())
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ oldPassword: 'member1234', newPassword: 'member5678' })
      .expect(200)

    await request(app.callback())
      .post('/api/auth/login')
      .send({ email: 'member1', password: 'member5678' })
      .expect(200)
  })

  it('sub user cannot access user list', async () => {
    const res = await request(app.callback())
      .get('/api/users')
      .set('Authorization', `Bearer ${userToken}`)
    expect(res.status).toBe(403)
  })

  it('admin disables sub user', async () => {
    await request(app.callback())
      .patch(`/api/users/${userId}/enabled`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ enabled: false })
      .expect(200)

    const login = await request(app.callback())
      .post('/api/auth/login')
      .send({ email: 'member1', password: 'member5678' })
    expect(login.status).toBe(400)
  })

  it('admin deletes sub user', async () => {
    await request(app.callback())
      .delete(`/api/users/${userId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204)

    const list = await request(app.callback())
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
    expect(list.body.some((u: { id: number }) => u.id === userId)).toBe(false)

    const login = await request(app.callback())
      .post('/api/auth/login')
      .send({ email: 'member1', password: 'member5678' })
    expect(login.status).toBe(400)
  })

  it('cannot delete admin user', async () => {
    const admin = await request(app.callback())
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
    const adminId = admin.body.find((u: { role: string }) => u.role === 'admin').id

    const res = await request(app.callback())
      .delete(`/api/users/${adminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
    expect(res.status).toBe(400)
  })

  it('public register is forbidden', async () => {
    const res = await request(app.callback())
      .post('/api/auth/register')
      .send({ email: 'x', password: '123456', code: '000000' })
    expect(res.status).toBe(403)
  })
})
