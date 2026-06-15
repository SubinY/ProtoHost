import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import fs from 'fs/promises'
import path from 'path'

const testRoot = vi.hoisted(() => {
  const os = require('node:os') as typeof import('node:os')
  const pathMod = require('node:path') as typeof import('node:path')
  const base = pathMod.join(
    os.tmpdir(),
    `protohost-json-store-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  )
  process.env.STORAGE_DRIVER = 'json'
  process.env.JSON_STORE_PATH = base
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_at_least_32_chars'
  return base
})

import { bumpId, initJsonStore, readJson, withStoreLock, writeJson } from '../src/storage/json/store.js'
import type { User } from '../src/storage/types.js'

describe('JSON store', () => {
  beforeAll(async () => {
    await fs.mkdir(testRoot, { recursive: true })
    await initJsonStore()
  })

  afterAll(async () => {
    await fs.rm(testRoot, { recursive: true, force: true })
  })

  it('initializes empty data files', async () => {
    const users = await readJson<User[]>('users.json', [])
    expect(users).toEqual([])
    const meta = await readJson('_meta.json', {})
    expect(meta).toMatchObject({
      nextUserId: 1,
      nextGroupId: 1,
      nextProjectId: 1,
      nextVersionId: 1,
    })
  })

  it('allocates monotonic ids under lock', async () => {
    const ids = await withStoreLock(async () => {
      const a = await bumpId('nextUserId')
      const b = await bumpId('nextUserId')
      return [a, b]
    })
    expect(ids).toEqual([1, 2])
  })

  it('serializes concurrent writes', async () => {
    await writeJson('users.json', [] as User[])
    await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        withStoreLock(async () => {
          const users = await readJson<User[]>('users.json', [])
          users.push({
            id: i + 100,
            email: `u${i}@test.local`,
            passwordHash: 'hash',
            createdAt: new Date(),
          })
          await writeJson('users.json', users)
        }),
      ),
    )
    const users = await readJson<User[]>('users.json', [])
    expect(users).toHaveLength(10)
  })

  it('writes atomically via temp file', async () => {
    const fp = path.join(testRoot, 'atomic.json')
    await writeJson('atomic.json', { ok: true })
    const raw = await fs.readFile(fp, 'utf-8')
    expect(JSON.parse(raw)).toEqual({ ok: true })
    await fs.access(`${fp}.tmp`).then(
      () => {
        throw new Error('tmp should not remain')
      },
      () => undefined,
    )
  })
})
