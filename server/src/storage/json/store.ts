import fs from 'fs/promises'
import path from 'path'
import { env } from '../../config/env.js'

export interface StoreMeta {
  nextUserId: number
  nextGroupId: number
  nextProjectId: number
  nextVersionId: number
}

const DEFAULT_META: StoreMeta = {
  nextUserId: 1,
  nextGroupId: 1,
  nextProjectId: 1,
  nextVersionId: 1,
}

let storePath = ''
let lockChain: Promise<void> = Promise.resolve()

export function getJsonStorePath(): string {
  if (!storePath) {
    storePath = path.resolve(process.env.JSON_STORE_PATH || env.JSON_STORE_PATH)
  }
  return storePath
}

export function filePath(name: string): string {
  return path.join(getJsonStorePath(), name)
}

export async function withStoreLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lockChain.then(fn)
  lockChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function reviveDates(key: string, value: unknown): unknown {
  if (
    typeof value === 'string' &&
    (key.endsWith('At') || key === 'createdAt' || key === 'updatedAt' || key === 'lastUpdatedAt') &&
    /^\d{4}-\d{2}-\d{2}T/.test(value)
  ) {
    return new Date(value)
  }
  return value
}

export async function readJson<T>(name: string, fallback: T): Promise<T> {
  const fp = filePath(name)
  try {
    const raw = await fs.readFile(fp, 'utf-8')
    return JSON.parse(raw, reviveDates) as T
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return fallback
    throw err
  }
}

export async function writeJson<T>(name: string, data: T): Promise<void> {
  const fp = filePath(name)
  const tmp = `${fp}.tmp`
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf-8')
  await fs.rename(tmp, fp)
}

export async function initJsonStore(): Promise<void> {
  const base = getJsonStorePath()
  await fs.mkdir(base, { recursive: true })

  const files: Array<{ name: string; fallback: unknown }> = [
    { name: '_meta.json', fallback: DEFAULT_META },
    { name: 'users.json', fallback: [] },
    { name: 'groups.json', fallback: [] },
    { name: 'projects.json', fallback: [] },
    { name: 'versions.json', fallback: [] },
  ]

  for (const { name, fallback } of files) {
    const fp = filePath(name)
    try {
      await fs.access(fp)
    } catch {
      await writeJson(name, fallback)
    }
  }
}

/** Call only inside an existing withStoreLock block. */
export async function bumpId(key: keyof StoreMeta): Promise<number> {
  const meta = await readJson<StoreMeta>('_meta.json', { ...DEFAULT_META })
  const id = meta[key]
  meta[key] = id + 1
  await writeJson('_meta.json', meta)
  return id
}

export async function nextId(key: keyof StoreMeta): Promise<number> {
  return withStoreLock(() => bumpId(key))
}

export async function readMeta(): Promise<StoreMeta> {
  return readJson<StoreMeta>('_meta.json', { ...DEFAULT_META })
}

export async function writeMeta(meta: StoreMeta): Promise<void> {
  await writeJson('_meta.json', meta)
}
